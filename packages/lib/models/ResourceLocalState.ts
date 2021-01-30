import BaseModel from '../BaseModel';
import { ResourceLocalStateEntity } from '../services/database/types';
import Database from '../database';

export default class ResourceLocalState extends BaseModel {
	static tableName() {
		return 'resource_local_states';
	}

	static modelType() {
		return BaseModel.TYPE_RESOURCE_LOCAL_STATE;
	}

	static async byResourceId(resourceId: string) {
		if (!resourceId) throw new Error('Resource ID not provided'); // Sanity check

		const result = await this.modelSelectOne('SELECT * FROM resource_local_states WHERE resource_id = ?', [resourceId]);

		if (!result) {
			const defaultRow = this.db().createDefaultRow(this.tableName());
			delete defaultRow.id;
			defaultRow.resource_id = resourceId;
			return defaultRow;
		}

		return result;
	}

	static async save(o: ResourceLocalStateEntity) {
		const queries = [{ sql: 'DELETE FROM resource_local_states WHERE resource_id = ?', params: [o.resource_id] }, Database.insertQuery(this.tableName(), o)];

		return this.db().transactionExecBatch(queries);
	}

	static batchDelete(ids: string[], options: any = null) {
		options = options ? Object.assign({}, options) : {};
		options.idFieldName = 'resource_id';
		return super.batchDelete(ids, options);
	}
}
