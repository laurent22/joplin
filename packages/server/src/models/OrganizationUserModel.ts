import { Organization, OrganizationUser, OrganizationUserInvitationStatus, User, Uuid } from '../services/database/types';
import { ErrorForbidden, ErrorNotFound } from '../utils/errors';
import BaseModel, { AclAction, LoadOptions, UuidType } from './BaseModel';

export default class OrganizationUserModel extends BaseModel<OrganizationUser> {

	public get tableName(): string {
		return 'organization_users';
	}

	protected uuidType(): UuidType {
		return UuidType.Native;
	}

	public async orgUserByUserId(orgId: Uuid, userId: Uuid, options: LoadOptions = {}): Promise<OrganizationUser> {
		return this.db(this.tableName)
			.select(this.selectFields(options))
			.where('organization_id', '=', orgId)
			.where('user_id', '=', userId)
			.first();
	}

	public async orgUsers(orgId: Uuid, options: LoadOptions = {}): Promise<OrganizationUser[]> {
		return this.db(this.tableName)
			.select(this.selectFields(options))
			.where('organization_id', '=', orgId)
			.where('user_id', '!=', '')
			.where('invitation_status', '=', OrganizationUserInvitationStatus.Accepted);
	}

	public async orgUserByEmail(orgId: Uuid, email: Uuid) {
		const user = await this.models().user().loadByEmail(email, { fields: ['id'] });
		if (!user) throw new ErrorNotFound(`No such user: ${email}`);
		return this.orgUserByUserId(orgId, user.id);
	}

	public async checkIfAllowed(user: User, action: AclAction, resource: OrganizationUser = null, organization: Organization = null): Promise<void> {
		const getOrg = async () => {
			if (organization) return organization;
			organization = await this.models().organizations().load(resource.organization_id);
			if (!organization) throw new Error(`Could not load organization: ${resource.organization_id}`);
			return organization;
		};

		if (action === AclAction.Read) {
			const org = await getOrg();
			if (org.owner_id !== user.id) throw new ErrorForbidden('Cannot view users of this organisation');
		}

		if (action === AclAction.List) {
			const org = await getOrg();
			if (org.owner_id !== user.id) throw new ErrorForbidden('Cannot list the users of this organisation');
		}

		if (action === AclAction.Delete) {
			const org = await getOrg();
			if (resource.organization_id !== org.id) throw new ErrorForbidden('This user does not belong to this organization');
		}
	}

}
