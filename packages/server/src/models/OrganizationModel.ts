import { Organization, OrganizationUser, OrganizationUserInvitationStatus, Uuid } from '../services/database/types';
import { ErrorUnprocessableEntity } from '../utils/errors';
import { organizationInvitationConfirmUrl } from '../utils/urlUtils';
import orgInviteUserTemplate from '../views/emails/orgInviteUserTemplate';
import BaseModel, { UuidType, ValidateOptions } from './BaseModel';
import { AccountType } from './UserModel';


export default class OrganizationModel extends BaseModel<Organization> {

	public get tableName(): string {
		return 'organizations';
	}

	protected uuidType(): UuidType {
		return UuidType.Native;
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
			if (org.max_users < 2) throw new ErrorUnprocessableEntity('Organisation must have at least 2 users');
		}

		return org;
	}

	public async inviteUser(orgId: Uuid, email: string) {
		const user = await this.models().user().loadByEmail(email);
		if (user) throw new ErrorUnprocessableEntity('This user already has a non-organisation account. Only users that are not already on the system can be invited.');

		const org = await this.load(orgId);
		if (!org) throw new Error(`No such organisation: ${orgId}`);

		return this.withTransaction<OrganizationUser>(async () => {
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
		}, 'OrganizationModel::inviteUser');
	}

}
