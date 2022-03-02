import { Storage } from '../services/database/types';
import BaseModel from './BaseModel';

export default class StorageModel extends BaseModel<Storage> {

	public get tableName(): string {
		return 'storages';
	}

	protected hasUuid(): boolean {
		return false;
	}

	public async byConnectionString(connectionString: string): Promise<Storage> {
		return this.db(this.tableName).where('connection_string', connectionString).first();
	}

	public async byId(id: number): Promise<Storage> {
		return this.db(this.tableName).where('id', id).first();
	}

}
