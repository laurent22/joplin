const BaseItem = require('lib/models/BaseItem.js');
const BaseModel = require('lib/BaseModel.js');

class NoteTag extends BaseItem {
	static tableName() {
		return 'note_tags';
	}

	static modelType() {
		return BaseModel.TYPE_NOTE_TAG;
	}

	static async byNoteIds(noteIds) {
		if (!noteIds.length) return [];
		return this.modelSelectAll(`SELECT * FROM note_tags WHERE note_id IN ("${noteIds.join('","')}")`);
	}

	static async tagIdsByNoteId(noteId) {
		const rows = await this.db().selectAll('SELECT tag_id FROM note_tags WHERE note_id = ?', [noteId]);
		const output = [];
		for (let i = 0; i < rows.length; i++) {
			output.push(rows[i].tag_id);
		}
		return output;
	}
}

module.exports = NoteTag;
