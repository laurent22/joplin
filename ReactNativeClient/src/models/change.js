import { BaseModel } from 'src/base-model.js';
import { Log } from 'src/log.js';

class Change extends BaseModel {

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
		return this.db().selectAll('SELECT * FROM changes');
	}

	static deleteMultiple(ids) {
		if (ids.length == 0) return Promise.resolve();

		console.warn('TODO: deleteMultiple: CHECK THAT IT WORKS');

		let queries = [];
		for (let i = 0; i < ids.length; i++) {
			queries.push(['DELETE FROM changes WHERE id = ?', [ids[i]]]);
		}

		return this.db().transactionExecBatch(queries);
	}

	static mergeChanges(changes) {
		let createdItems = [];
		let deletedItems = [];
		let itemChanges = {};

		for (let i = 0; i < changes.length; i++) {
			let change = changes[i];
			let mergedChange = null;

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

Change.TYPE_NOOP = 0;
Change.TYPE_CREATE = 1;
Change.TYPE_UPDATE = 2;
Change.TYPE_DELETE = 3;

export { Change };