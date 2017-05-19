import { BaseModel } from 'src/base-model.js';
import { Log } from 'src/log.js';

class Note extends BaseModel {

	static tableName() {
		return 'notes';
	}

	static useUuid() {
		return true;
	}

	static itemType() {
		return BaseModel.ITEM_TYPE_NOTE;
	}

	static trackChanges() {
		return true;
	}

	static new(parentId = '') {
		let output = super.new();
		output.parent_id = parentId;
		return output;
	}

	static previews(parentId) {
		return this.db().selectAll('SELECT id, title, body, parent_id, updated_time FROM notes WHERE parent_id = ?', [parentId]).then((r) => {
			let output = [];
			for (let i = 0; i < r.rows.length; i++) {
				output.push(r.rows.item(i));
			}
			return output;
		});
	}

	static byFolderId() {

	}

}

export { Note };