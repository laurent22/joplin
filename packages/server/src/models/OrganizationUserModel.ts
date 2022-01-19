import { Organization, OrganizationUser, User } from '../services/database/types';
import { ErrorForbidden } from '../utils/errors';
import BaseModel, { AclAction, UuidType } from './BaseModel';

export default class OrganizationUserModel extends BaseModel<OrganizationUser> {

	public get tableName(): string {
		return 'organization_users';
	}

	protected uuidType(): UuidType {
		return UuidType.Native;
	}

	public async checkIfAllowed(user: User, action: AclAction, _resource: OrganizationUser = null, organization: Organization = null): Promise<void> {
		if (!organization) throw new Error('organization is required');

		if (action === AclAction.List) {
			if (organization.owner_id !== user.id) throw new ErrorForbidden('Cannot list the users of this organisation');
		}
	}

}
