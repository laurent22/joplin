import { BaseModel } from 'lib/base-model.js';
import { Database } from 'lib/database.js';
import { BaseItem } from 'lib/models/base-item.js';
import lodash  from 'lodash';

class Tag extends BaseItem {

	static tableName() {
		return 'tags';
	}

	static itemType() {
		return BaseModel.MODEL_TYPE_TAG;
	}

	static async serialize(item, type = null, shownKeys = null) {
		let fieldNames = this.fieldNames();
		fieldNames.push('type_');
		fieldNames.push(() => {
			
		});
		lodash.pull(fieldNames, 'sync_time');
		return super.serialize(item, 'tag', fieldNames);
	}

	static tagNoteIds(tagId) {
		return this.db().selectAll('SELECT note_id FROM note_tags WHERE tag_id = ?', [tagId]);
	}

	static async addNote(tagId, noteId) {
		let hasIt = await this.hasNote(tagId, noteId);
		if (hasIt) return;

		let query = Database.insertQuery('note_tags', {
			tag_id: tagId,
			note_id: noteId,
		});
		return this.db().exec(query);
	}

	static async hasNote(tagId, noteId) {
		let r = await this.db().selectOne('SELECT note_id FROM note_tags WHERE tag_id = ? AND note_id = ? LIMIT 1', [tagId, noteId]);
		return !!r;
	}

	static removeNote(tagId, noteId) {
		return this.db().exec('DELETE FROM note_tags WHERE tag_id = ? AND note_id = ?', [tagId, noteId]);
	}

}

export { Tag };