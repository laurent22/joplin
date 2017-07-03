import { BaseModel } from 'lib/base-model.js';
import { Database } from 'lib/database.js';
import { BaseItem } from 'lib/models/base-item.js';
import { NoteTag } from 'lib/models/note-tag.js';
import { Note } from 'lib/models/note.js';
import { time } from 'lib/time-utils.js';
import lodash  from 'lodash';

class Tag extends BaseItem {

	static tableName() {
		return 'tags';
	}

	static modelType() {
		return BaseModel.TYPE_TAG;
	}

	static async serialize(item, type = null, shownKeys = null) {
		let fieldNames = this.fieldNames();
		fieldNames.push('type_');
		lodash.pull(fieldNames, 'sync_time');
		return super.serialize(item, 'tag', fieldNames);
	}

	static async tagNoteIds(tagId) {
		let rows = await this.db().selectAll('SELECT note_id FROM note_tags WHERE tag_id = ?', [tagId]);
		let output = [];
		for (let i = 0; i < rows.length; i++) {
			output.push(rows[i].note_id);
		}
		return output;
	}

	static async notes(tagId) {
		let noteIds = await this.tagNoteIds(tagId);
		if (!noteIds.length) return [];

		return Note.search({
			conditions: ['id IN ("' + noteIds.join('","') + '")'],
		});
	}

	static async addNote(tagId, noteId) {
		let hasIt = await this.hasNote(tagId, noteId);
		if (hasIt) return;

		return NoteTag.save({
			tag_id: tagId,
			note_id: noteId,
		});
	}

	static async removeNote(tagId, noteId) {
		let noteTags = await NoteTag.modelSelectAll('SELECT id FROM note_tags WHERE tag_id = ? and note_id = ?', [tagId, noteId]);
		for (let i = 0; i < noteTags.length; i++) {
			await NoteTag.delete(noteTags[i].id);
		}
	}

	static async hasNote(tagId, noteId) {
		let r = await this.db().selectOne('SELECT note_id FROM note_tags WHERE tag_id = ? AND note_id = ? LIMIT 1', [tagId, noteId]);
		return !!r;
	}

}

export { Tag };