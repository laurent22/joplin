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

	public async checkIfAllowed(user: User, action: AclAction, resource: OrganizationUser = null, organization: Organization = null): Promise<void> {
		const getOrg = async() => {
			if (organization) return organization;
			organization = await this.models().organizations().load(resource.organization_id);
			if (!organization) throw new Error('Could not load organization: ' + resource.organization_id);
			return organization;
		}

		if (action === AclAction.Read) {
			const org = await getOrg();
			if (org.owner_id !== user.id) throw new ErrorForbidden('Cannot view users of this organisation');
		}

		if (action === AclAction.List) {
			const org = await getOrg();
			if (org.owner_id !== user.id) throw new ErrorForbidden('Cannot list the users of this organisation');
		}
	}

}
