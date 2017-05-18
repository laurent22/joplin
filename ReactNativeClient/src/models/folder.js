import { BaseModel } from 'src/base-model.js';
import { Log } from 'src/log.js';

class Folder extends BaseModel {

	static tableName() {
		return 'folders';
	}

	static useUuid() {
		return true;
	}

	static itemType() {
		return BaseModel.ITEM_TYPE_FOLDER;
	}

	static trackChanges() {
		return true;
	}

	static newFolder() {
		return {
			id: null,
			title: '',
		}
	}

	static delete(id) {
		return this.db().transactionPromise((tx) => {
			tx.executeSql('DELETE FROM notes WHERE parent_id = ?', [id]);
			tx.executeSql('DELETE FROM folders WHERE id = ?', [id]);
		});
	}

	static all() {
		return this.db().selectAll('SELECT * FROM folders').then((r) => {
			let output = [];
			for (let i = 0; i < r.rows.length; i++) {
				output.push(r.rows.item(i));
			}
			return output;
		});
	}

}

export { Folder };