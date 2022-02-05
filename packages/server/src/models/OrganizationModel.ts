import { Organization, OrganizationUser, OrganizationUserInvitationStatus, UserFlagType, Uuid } from '../services/database/types';
import { ErrorBadRequest, ErrorForbidden, ErrorUnprocessableEntity } from '../utils/errors';
import { organizationInvitationConfirmUrl } from '../utils/urlUtils';
import uuidgen from '../utils/uuidgen';
import orgInviteUserTemplate from '../views/emails/orgInviteUserTemplate';
import BaseModel, { UuidType, ValidateOptions } from './BaseModel';
import { AccountType } from './UserModel';

export const organizationMinUsers = 2;
export const organizationMaxUsers = 100;

export default class OrganizationModel extends BaseModel<Organization> {

	public get tableName(): string {
		return 'organizations';
	}

	protected uuidType(): UuidType {
		return UuidType.Native;
	}

	public async byOwnerId(ownerId: Uuid): Promise<Organization | null> {
		return this.db(this.tableName).where('owner_id', '=', ownerId).first();
	}

	public async userAssociatedOrganization(userId: Uuid): Promise<Organization | null> {
		const org = await this.db(this.tableName).where('owner_id', '=', userId).first();
		if (org) return org;

		return this
			.db('organization_users')
			.leftJoin('organizations', 'organizations.id', 'organization_users.organization_id')
			.select(this.defaultFieldsWithPrefix)
			.where('organization_users.user_id', '=', userId)
			.where('organization_users.invitation_status', '=', OrganizationUserInvitationStatus.Accepted)
			.first();
	}

	protected async validate(object: Organization, options: ValidateOptions = {}): Promise<Organization> {
		const org: Organization = await super.validate(object, options);

		if ('owner_id' in org) {
			const orgOwner = await this.models().user().load(org.owner_id, { fields: ['id', 'account_type'] });
			if (!orgOwner) throw new ErrorUnprocessableEntity(`Organisation owner does not exist: ${org.owner_id}`);
			if (orgOwner.account_type !== AccountType.Pro) throw new ErrorUnprocessableEntity(`Organisation owner must be a Pro account: ${org.owner_id}`);
		}

		if ('name' in org) {
			if (!org.name) throw new ErrorUnprocessableEntity('Organisation name must not be empty');
		}

		if ('max_users' in org) {
			if (isNaN(org.max_users) || org.max_users < 2) throw new ErrorUnprocessableEntity('Organisation must have at least 2 users');
		}

		return org;
	}

	public async activeInvitationCount(orgId: Uuid): Promise<number> {
		const r = await this
			.db('organization_users')
			.count('id', { as: 'item_count' })
			.where('organization_id', '=', orgId)
			.where('invitation_status', '!=', OrganizationUserInvitationStatus.Rejected);
		return r[0].item_count;
	}

	public async addUsers(orgId: Uuid, emails: string[]): Promise<void> {
		await this.withTransaction(async () => {
			for (const email of emails) {
				const orgUser = await this.inviteUser(orgId, email);
				await this.respondInvitation(orgUser.id, OrganizationUserInvitationStatus.Accepted);
			}
		});
	}

	public async inviteUser(orgId: Uuid, email: string) {
		const user = await this.models().user().loadByEmail(email);
		if (user) throw new ErrorUnprocessableEntity('This user already has a non-organisation account. Only users that are not already on the system can be invited.');

		const org = await this.load(orgId);
		if (!org) throw new Error(`No such organisation: ${orgId}`);

		return this.withTransaction<OrganizationUser>(async () => {
			// The `forUpdate` statement below means we take a lock on the
			// organization row, which ensures no other routine is going to send
			// any other invitation for this org while this transaction is
			// active.
			//
			// Otherwise there would be a race condition that would allow going
			// over max_users if multiple invitations are sent at the same time.
			//
			// That lock is released on commit or error.
			//
			// https://dba.stackexchange.com/a/167283/37012

			await this.db(this.tableName).forUpdate().where('id', '=', orgId);

			if (await this.activeInvitationCount(org.id) >= org.max_users) throw new ErrorBadRequest(`Cannot add any more than ${org.max_users} users to this organisation.`);

			const orgUser = await this.models().organizationUsers().save({
				organization_id: orgId,
				invitation_email: email,
				invitation_status: OrganizationUserInvitationStatus.Sent,
				is_admin: 0,
			});

			await this.models().email().push({
				...orgInviteUserTemplate({
					organizationName: org.name,
					url: organizationInvitationConfirmUrl(orgUser.id),
				}),
				recipient_email: email,
			});

			return orgUser;
		});
	}

	public async respondInvitation(orgUserId: Uuid, status: OrganizationUserInvitationStatus) {
		const orgUser = await this.models().organizationUsers().load(orgUserId);
		if (!orgUser) throw new ErrorBadRequest(`No such invitation: ${orgUserId}`);
		if (![OrganizationUserInvitationStatus.Accepted, OrganizationUserInvitationStatus.Rejected].includes(status)) throw new ErrorBadRequest('Status can only be "accepted" or "rejected"');
		if (orgUser.invitation_status !== OrganizationUserInvitationStatus.Sent) throw new ErrorBadRequest('Invitation status cannot be changed');

		await this.withTransaction(async () => {
			const newOrgUser: OrganizationUser = {
				id: orgUserId,
				invitation_status: status,
			};

			if (status === OrganizationUserInvitationStatus.Accepted) {
				const user = await this.models().user().save({
					account_type: AccountType.Pro,
					email: orgUser.invitation_email,
					email_confirmed: 1,
					must_set_password: 1,
					password: uuidgen(),
				});

				newOrgUser.user_id = user.id;
			}

			await this.models().organizationUsers().save(newOrgUser);
		});
	}

	public async removeUser(orgId: Uuid, orgUserId: Uuid) {
		return this.removeUsers(orgId, [orgUserId]);
	}

	public async removeUsers(orgId: Uuid, orgUserIds: Uuid[]) {
		const org = await this.load(orgId, { fields: ['id'] });
		if (!org) throw new ErrorBadRequest(`No such org: ${orgId}`);

		const orgUsers = await this.models().organizationUsers().loadByIds(orgUserIds, { fields: ['id', 'user_id', 'organization_id'] });
		if (orgUsers.length !== orgUserIds.length) throw new ErrorForbidden('One or more users does not belong to the organization');

		await this.withTransaction(async () => {
			for (const orgUser of orgUsers) {
				if (orgUser.organization_id !== org.id) throw new ErrorForbidden(`User ${orgUser.user_id} does not belong to organization ${org.id}`);
				await this.models().organizationUsers().delete(orgUser.id);
				await this.models().userFlag().add(orgUser.user_id, UserFlagType.RemovedFromOrganization);
			}
		});
	}

}
