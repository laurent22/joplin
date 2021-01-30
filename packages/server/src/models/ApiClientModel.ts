import BaseModel from './BaseModel';
import { ApiClient } from '../db';

export default class ApiClientModel extends BaseModel<ApiClient> {

	protected get tableName(): string {
		return 'api_clients';
	}

}
