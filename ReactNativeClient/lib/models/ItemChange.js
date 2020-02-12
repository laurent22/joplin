const BaseModel = require('lib/BaseModel.js');
const Mutex = require('async-mutex').Mutex;

class ItemChange extends BaseModel {
	static tableName() {
		return 'item_changes';
	}

	static modelType() {
		return BaseModel.TYPE_ITEM_CHANGE;
	}

	static async add(itemType, itemId, type, changeSource = null, beforeChangeItemJson = null) {
		if (changeSource === null) changeSource = ItemChange.SOURCE_UNSPECIFIED;
		if (!beforeChangeItemJson) beforeChangeItemJson = '';

		ItemChange.saveCalls_.push(true);

		// Using a mutex so that records can be added to the database in the
		// background, without making the UI wait.
		const release = await ItemChange.addChangeMutex_.acquire();

		try {
			await this.db().transactionExecBatch([{ sql: 'DELETE FROM item_changes WHERE item_id = ?', params: [itemId] }, { sql: 'INSERT INTO item_changes (item_type, item_id, type, source, created_time, before_change_item) VALUES (?, ?, ?, ?, ?, ?)', params: [itemType, itemId, type, changeSource, Date.now(), beforeChangeItemJson] }]);
		} finally {
			release();
			ItemChange.saveCalls_.pop();
		}
	}

	static async lastChangeId() {
		const row = await this.db().selectOne('SELECT max(id) as max_id FROM item_changes');
		return row && row.max_id ? row.max_id : 0;
	}

	// Because item changes are recorded in the background, this function
	// can be used for synchronous code, in particular when unit testing.
	static async waitForAllSaved() {
		return new Promise((resolve) => {
			const iid = setInterval(() => {
				if (!ItemChange.saveCalls_.length) {
					clearInterval(iid);
					resolve();
				}
			}, 100);
		});
	}

	static async deleteOldChanges(lowestChangeId) {
		if (!lowestChangeId) return;
		return this.db().exec('DELETE FROM item_changes WHERE id <= ?', [lowestChangeId]);
	}
}

ItemChange.addChangeMutex_ = new Mutex();
ItemChange.saveCalls_ = [];

ItemChange.TYPE_CREATE = 1;
ItemChange.TYPE_UPDATE = 2;
ItemChange.TYPE_DELETE = 3;

ItemChange.SOURCE_UNSPECIFIED = 1;
ItemChange.SOURCE_SYNC = 2;
ItemChange.SOURCE_DECRYPTION = 2;

module.exports = ItemChange;
