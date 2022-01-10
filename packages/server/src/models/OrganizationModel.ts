import { Organization } from '../services/database/types';
import BaseModel, { UuidType } from './BaseModel';


export default class OrganizationModel extends BaseModel<Organization> {

	public get tableName(): string {
		return 'organizations';
	}

	protected uuidType(): UuidType {
		return UuidType.Native;
	}

}
