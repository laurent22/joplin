import { BaseModel } from 'src/base-model.js';
import { Log } from 'src/log.js';

class Note extends BaseModel {

	static tableName() {
		return 'notes';
	}

	static useUuid() {
		return true;
	}

	static newNote(parentId = null) {
		return {
			id: null,
			title: '',
			body: '',
			parent_id: parentId,
		}
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