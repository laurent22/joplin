const BaseModel = require('lib/BaseModel.js');
const Mutex = require('async-mutex').Mutex;

class ItemChange extends BaseModel {

	static tableName() {
		return 'item_changes';
	}

	static modelType() {
		return BaseModel.TYPE_ITEM_CHANGE;
	}

	static async add(itemType, itemId, type) {
		const release = await ItemChange.addChangeMutex_.acquire();

		try {
			await this.db().transactionExecBatch([
				{ sql: 'DELETE FROM item_changes WHERE item_id = ?', params: [itemId] },
				{ sql: 'INSERT INTO item_changes (item_type, item_id, type, created_time) VALUES (?, ?, ?, ?)', params: [itemType, itemId, type, Date.now()] },
			]);
		} finally {
			release();
		}
	}

}

ItemChange.addChangeMutex_ = new Mutex();

ItemChange.TYPE_CREATE = 1;
ItemChange.TYPE_UPDATE = 2;
ItemChange.TYPE_DELETE = 3;

module.exports = ItemChange;