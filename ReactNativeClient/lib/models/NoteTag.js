const BaseItem = require('lib/models/BaseItem.js');
const BaseModel = require('lib/BaseModel.js');

class NoteTag extends BaseItem {
	static tableName() {
		return 'note_tags';
	}

	static modelType() {
		return BaseModel.TYPE_NOTE_TAG;
	}

	// This method works for all notes including those in trash
	static async byNoteIds(noteIds) {
		if (!noteIds.length) return [];
		return this.modelSelectAll(`SELECT * FROM note_tags WHERE note_id IN ("${noteIds.join('","')}")`);
	}

	// This method works for all notes including those in trash
	static async tagIdsByNoteId(noteId) {
		const rows = await this.db().selectAll('SELECT tag_id FROM note_tags WHERE note_id = ?', [noteId]);
		const output = [];
		for (let i = 0; i < rows.length; i++) {
			output.push(rows[i].tag_id);
		}
		return output;
	}

	// This method works for all notes including those in trash
	static async exists(noteId, tagId) {
		const r = await this.db().selectOne('SELECT note_id FROM note_tags WHERE tag_id = ? AND note_id = ? LIMIT 1', [tagId, noteId]);
		return !!r;
	}
}

module.exports = NoteTag;
