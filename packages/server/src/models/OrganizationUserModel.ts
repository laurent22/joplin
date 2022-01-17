import { OrganizationUser } from '../services/database/types';
import BaseModel, { UuidType } from './BaseModel';

export default class OrganizationUserModel extends BaseModel<OrganizationUser> {

	public get tableName(): string {
		return 'organization_users';
	}

	protected uuidType(): UuidType {
		return UuidType.Native;
	}

}
