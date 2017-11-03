const { BaseModel } = require('lib/base-model.js');
const { BaseItem } = require('lib/models/base-item.js');
const { NoteTag } = require('lib/models/note-tag.js');
const { Note } = require('lib/models/note.js');
const { time } = require('lib/time-utils.js');
const lodash = require('lodash');

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
		return super.serialize(item, 'tag', fieldNames);
	}

	static async noteIds(tagId) {
		let rows = await this.db().selectAll('SELECT note_id FROM note_tags WHERE tag_id = ?', [tagId]);
		let output = [];
		for (let i = 0; i < rows.length; i++) {
			output.push(rows[i].note_id);
		}
		return output;
	}

	static async notes(tagId) {
		let noteIds = await this.noteIds(tagId);
		if (!noteIds.length) return [];

		return Note.search({
			conditions: ['id IN ("' + noteIds.join('","') + '")'],
		});
	}

	static async addNote(tagId, noteId) {
		let hasIt = await this.hasNote(tagId, noteId);
		if (hasIt) return;

		const output = await NoteTag.save({
			tag_id: tagId,
			note_id: noteId,
		});

		this.dispatch({
			type: 'TAGS_UPDATE_ONE',
			tag: await Tag.load(tagId),
		});

		return output;
	}

	static async removeNote(tagId, noteId) {
		let noteTags = await NoteTag.modelSelectAll('SELECT id FROM note_tags WHERE tag_id = ? and note_id = ?', [tagId, noteId]);
		for (let i = 0; i < noteTags.length; i++) {
			await NoteTag.delete(noteTags[i].id);
		}

		this.dispatch({
			type: 'TAGS_UPDATE_ONE',
			tag: await Tag.load(tagId),
		});
	}

	static async hasNote(tagId, noteId) {
		let r = await this.db().selectOne('SELECT note_id FROM note_tags WHERE tag_id = ? AND note_id = ? LIMIT 1', [tagId, noteId]);
		return !!r;
	}

	static async allWithNotes() {
		return await Tag.modelSelectAll('SELECT * FROM tags WHERE id IN (SELECT DISTINCT tag_id FROM note_tags)');
	}

	static async save(o, options = null) {
		return super.save(o, options).then((tag) => {
			this.dispatch({
				type: 'TAGS_UPDATE_ONE',
				tag: tag,
			});
			return tag;
		});
	}

}

export { Tag };