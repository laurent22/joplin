import { BaseModel } from 'src/base-model.js';

class ItemSyncTime extends BaseModel {

	static time(itemId) {
		if (itemId in this.cache_) return Promise.resolve(this.cache_[itemId]);

		return this.db().selectOne('SELECT * FROM item_sync_times WHERE item_id = ?', [itemId]).then((row) => {
			this.cache_[itemId] = row ? row.time : 0;
			return this.cache_[itemId];
		});
	}

	static setTime(itemId, time) {
		return this.db().selectOne('SELECT * FROM item_sync_times WHERE item_id = ?', [itemId]).then((row) => {
			let p = null;
			if (row) {
				p = this.db().exec('UPDATE item_sync_times SET `time` = ? WHERE item_id = ?', [time, itemId]);
			} else {
				p = this.db().exec('INSERT INTO item_sync_times (item_id, `time`) VALUES (?, ?)', [itemId, time]);
			}

			return p.then(() => {
				this.cache_[itemId] = time;
			});
		});
	}

	static deleteTime(itemId) {
		return this.db().exec('DELETE FROM item_sync_times WHERE item_id = ?', [itemId]).then(() => {
			delete this.cache_[itemId];
		});
	}

}

ItemSyncTime.cache_ = {};

export { ItemSyncTime };