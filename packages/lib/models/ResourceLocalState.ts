import BaseModel, { DeleteOptions } from '../BaseModel';
import { ResourceLocalStateEntity } from '../services/database/types';
import Database from '../database';
import ActionLogger from '../utils/ActionLogger';

export default class ResourceLocalState extends BaseModel {
	public static tableName() {
		return 'resource_local_states';
	}

	public static modelType() {
		return BaseModel.TYPE_RESOURCE_LOCAL_STATE;
	}

	public static async byResourceId(resourceId: string) {
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

	public static saveQueries(o: ResourceLocalStateEntity) {
		return [{ sql: 'DELETE FROM resource_local_states WHERE resource_id = ?', params: [o.resource_id] }, Database.insertQuery(this.tableName(), o)];
	}

	public static async save(o: ResourceLocalStateEntity) {
		return this.db().transactionExecBatch(this.saveQueries(o));
	}

	public static batchDelete(ids: string[], options: DeleteOptions = {}) {
		options = { ...options };
		options.idFieldName = 'resource_id';
		options.sourceDescription = ActionLogger.from(options.sourceDescription);
		options.sourceDescription.addDescription('Delete local resource state');
		return super.batchDelete(ids, options);
	}
}
