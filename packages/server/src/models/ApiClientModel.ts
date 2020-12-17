import { DbConnection, ItemType } from '../db';
import BaseModel, { ModelOptions } from './BaseModel';

export default class ApiClientModel extends BaseModel {

	constructor(db: DbConnection, options: ModelOptions) {
		super(db, options);
	}

	get tableName(): string {
		return 'api_clients';
	}

}
