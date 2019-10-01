import BaseModel from './BaseModel';

export default class ApiClientModel extends BaseModel {

	get tableName():string {
		return 'api_clients';
	}

}
