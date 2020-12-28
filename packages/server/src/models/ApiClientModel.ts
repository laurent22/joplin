import BaseModel from './BaseModel';

export default class ApiClientModel extends BaseModel {

	protected get tableName(): string {
		return 'api_clients';
	}

}
