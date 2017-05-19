import { BaseModel } from 'src/base-model.js';
import { Log } from 'src/log.js';

class Change extends BaseModel {

	static TYPE_NOOP = 0;
	static TYPE_CREATE = 1;
	static TYPE_UPDATE = 2;
	static TYPE_DELETE = 3;

	static tableName() {
		return 'changes';
	}

	static newChange() {
		return {
			id: null,
			type: null,
			item_id: null,
			item_type: null,
			item_field: null,
		};
	}

	static all() {
		return this.db().selectAll('SELECT * FROM changes').then((r) => {
			let output = [];
			for (let i = 0; i < r.rows.length; i++) {
				output.push(r.rows.item(i));
			}
			return output;
		});
	}

	static deleteMultiple(ids) {
		if (ids.length == 0) return Promise.resolve();

		return this.db().transaction((tx) => {
			let sql = '';
			for (let i = 0; i < ids.length; i++) {
				tx.executeSql('DELETE FROM changes WHERE id = ?', [ids[i]]);
			}			
		});
	}

	static mergeChanges(changes) {
		let createdItems = [];
		let deletedItems = [];
		let itemChanges = {};

		for (let i = 0; i < changes.length; i++) {
			let change = changes[i];

			if (itemChanges[change.item_id]) {
				mergedChange = itemChanges[change.item_id];
			} else {
				mergedChange = {
					item_id: change.item_id,
					item_type: change.item_type,
					fields: [],
					ids: [],
					type: change.type,
				}
			}

			if (change.type == this.TYPE_CREATE) {
				createdItems.push(change.item_id);
			} else if (change.type == this.TYPE_DELETE) {
				deletedItems.push(change.item_id);
			} else if (change.type == this.TYPE_UPDATE) {
				if (mergedChange.fields.indexOf(change.item_field) < 0) {
					mergedChange.fields.push(change.item_field);
				}
			}

			mergedChange.ids.push(change.id);

			itemChanges[change.item_id] = mergedChange;
		}

		let output = [];

		for (let itemId in itemChanges) {
			if (!itemChanges.hasOwnProperty(itemId)) continue;
			let change = itemChanges[itemId];

			if (createdItems.indexOf(itemId) >= 0 && deletedItems.indexOf(itemId) >= 0) {
				// Item both created then deleted - skip
				change.type = this.TYPE_NOOP;
			} else if (deletedItems.indexOf(itemId) >= 0) {
				// Item was deleted at some point - just return one 'delete' event
				change.type = this.TYPE_DELETE;
			} else if (createdItems.indexOf(itemId) >= 0) {
				// Item was created then updated - just return one 'create' event with the latest changes
				change.type = this.TYPE_CREATE;
			}

			output.push(change);
		}

		return output;
	}

}

export { Change };