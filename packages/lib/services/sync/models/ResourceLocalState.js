"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseModel_1 = require("../BaseModel");
const database_1 = require("../database");
const ActionLogger_1 = require("../utils/ActionLogger");
class ResourceLocalState extends BaseModel_1.default {
    static tableName() {
        return 'resource_local_states';
    }
    static modelType() {
        return BaseModel_1.default.TYPE_RESOURCE_LOCAL_STATE;
    }
    static async byResourceId(resourceId) {
        if (!resourceId)
            throw new Error('Resource ID not provided'); // Sanity check
        const result = await this.modelSelectOne('SELECT * FROM resource_local_states WHERE resource_id = ?', [resourceId]);
        if (!result) {
            const defaultRow = this.db().createDefaultRow(this.tableName());
            delete defaultRow.id;
            defaultRow.resource_id = resourceId;
            return defaultRow;
        }
        return result;
    }
    static saveQueries(o) {
        return [{ sql: 'DELETE FROM resource_local_states WHERE resource_id = ?', params: [o.resource_id] }, database_1.default.insertQuery(this.tableName(), o)];
    }
    static async save(o) {
        return this.db().transactionExecBatch(this.saveQueries(o));
    }
    static batchDelete(ids, options = {}) {
        options = Object.assign({}, options);
        options.idFieldName = 'resource_id';
        options.sourceDescription = ActionLogger_1.default.from(options.sourceDescription);
        options.sourceDescription.addDescription('Delete local resource state');
        return super.batchDelete(ids, options);
    }
}
exports.default = ResourceLocalState;
