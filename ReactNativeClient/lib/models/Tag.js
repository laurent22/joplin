const BaseModel = require('lib/BaseModel.js');
const BaseItem = require('lib/models/BaseItem.js');
const NoteTag = require('lib/models/NoteTag.js');
const Note = require('lib/models/Note.js');
const { _ } = require('lib/locale');

class Tag extends BaseItem {
	static tableName() {
		return 'tags';
	}

	static modelType() {
		return BaseModel.TYPE_TAG;
	}

	static async noteIds(tagId) {
		const rows = await this.db().selectAll('SELECT note_id FROM note_tags WHERE tag_id = ?', [tagId]);
		const output = [];
		for (let i = 0; i < rows.length; i++) {
			output.push(rows[i].note_id);
		}
		return output;
	}

	static async notes(tagId, options = null) {
		if (options === null) options = {};

		const noteIds = await this.noteIds(tagId);
		if (!noteIds.length) return [];

		return Note.previews(
			null,
			Object.assign({}, options, {
				conditions: [`id IN ("${noteIds.join('","')}")`],
			})
		);
	}

	// Untag all the notes and delete tag
	static async untagAll(tagId) {
		const noteTags = await NoteTag.modelSelectAll('SELECT id FROM note_tags WHERE tag_id = ?', [tagId]);
		for (let i = 0; i < noteTags.length; i++) {
			await NoteTag.delete(noteTags[i].id);
		}

		await Tag.delete(tagId);
	}

	static async delete(id, options = null) {
		if (!options) options = {};

		await super.delete(id, options);

		this.dispatch({
			type: 'TAG_DELETE',
			id: id,
		});
	}

	static async addNote(tagId, noteId) {
		const hasIt = await this.hasNote(tagId, noteId);
		if (hasIt) return;

		const output = await NoteTag.save({
			tag_id: tagId,
			note_id: noteId,
		});

		this.dispatch({
			type: 'TAG_UPDATE_ONE',
			item: await Tag.loadWithCount(tagId),
		});

		return output;
	}

	static async removeNote(tagId, noteId) {
		const noteTags = await NoteTag.modelSelectAll('SELECT id FROM note_tags WHERE tag_id = ? and note_id = ?', [tagId, noteId]);
		for (let i = 0; i < noteTags.length; i++) {
			await NoteTag.delete(noteTags[i].id);
		}

		this.dispatch({
			type: 'NOTE_TAG_REMOVE',
			item: await Tag.load(tagId),
		});
	}

	static loadWithCount(tagId) {
		const sql = 'SELECT * FROM tags_with_note_count WHERE id = ?';
		return this.modelSelectOne(sql, [tagId]);
	}

	static async hasNote(tagId, noteId) {
		const r = await this.db().selectOne('SELECT note_id FROM note_tags WHERE tag_id = ? AND note_id = ? LIMIT 1', [tagId, noteId]);
		return !!r;
	}

	static async allWithNotes() {
		return await Tag.modelSelectAll('SELECT * FROM tags_with_note_count');
	}

	static async searchAllWithNotes(options) {
		if (!options) options = {};
		if (!options.conditions) options.conditions = [];
		options.conditions.push('id IN (SELECT distinct id FROM tags_with_note_count)');
		return this.search(options);
	}

	static async tagsByNoteId(noteId) {
		const tagIds = await NoteTag.tagIdsByNoteId(noteId);
		return this.modelSelectAll(`SELECT * FROM tags WHERE id IN ("${tagIds.join('","')}")`);
	}

	static async commonTagsByNoteIds(noteIds) {
		if (!noteIds || noteIds.length === 0) {
			return [];
		}
		let commonTagIds = await NoteTag.tagIdsByNoteId(noteIds[0]);
		for (let i = 1; i < noteIds.length; i++) {
			const tagIds = await NoteTag.tagIdsByNoteId(noteIds[i]);
			commonTagIds = commonTagIds.filter(value => tagIds.includes(value));
			if (commonTagIds.length === 0) {
				break;
			}
		}
		return this.modelSelectAll(`SELECT * FROM tags WHERE id IN ("${commonTagIds.join('","')}")`);
	}

	static async loadByTitle(title) {
		return this.loadByField('title', title, { caseInsensitive: true });
	}

	static async addNoteTagByTitle(noteId, tagTitle) {
		let tag = await this.loadByTitle(tagTitle);
		if (!tag) tag = await Tag.save({ title: tagTitle }, { userSideValidation: true });
		return await this.addNote(tag.id, noteId);
	}

	static async setNoteTagsByTitles(noteId, tagTitles) {
		const previousTags = await this.tagsByNoteId(noteId);
		const addedTitles = [];

		for (let i = 0; i < tagTitles.length; i++) {
			const title = tagTitles[i].trim().toLowerCase();
			if (!title) continue;
			let tag = await this.loadByTitle(title);
			if (!tag) tag = await Tag.save({ title: title }, { userSideValidation: true });
			await this.addNote(tag.id, noteId);
			addedTitles.push(title);
		}

		for (let i = 0; i < previousTags.length; i++) {
			if (addedTitles.indexOf(previousTags[i].title.toLowerCase()) < 0) {
				await this.removeNote(previousTags[i].id, noteId);
			}
		}
	}

	static async setNoteTagsByIds(noteId, tagIds) {
		const previousTags = await this.tagsByNoteId(noteId);
		const addedIds = [];

		for (let i = 0; i < tagIds.length; i++) {
			const tagId = tagIds[i];
			await this.addNote(tagId, noteId);
			addedIds.push(tagId);
		}

		for (let i = 0; i < previousTags.length; i++) {
			if (addedIds.indexOf(previousTags[i].id) < 0) {
				await this.removeNote(previousTags[i].id, noteId);
			}
		}
	}

	static async save(o, options = null) {
		if (options && options.userSideValidation) {
			if ('title' in o) {
				o.title = o.title.trim().toLowerCase();

				const existingTag = await Tag.loadByTitle(o.title);
				if (existingTag && existingTag.id !== o.id) throw new Error(_('The tag "%s" already exists. Please choose a different name.', o.title));
			}
		}

		return super.save(o, options).then(tag => {
			this.dispatch({
				type: 'TAG_UPDATE_ONE',
				item: tag,
			});
			return tag;
		});
	}
}

module.exports = Tag;
