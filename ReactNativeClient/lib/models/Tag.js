const BaseModel = require('lib/BaseModel.js');
const BaseItem = require('lib/models/BaseItem.js');
const NoteTag = require('lib/models/NoteTag.js');
const FolderTag = require('lib/models/FolderTag.js');
const Note = require('lib/models/Note.js');
const Folder = require('lib/models/Folder.js');
const { _ } = require('lib/locale');
const { TRASH_TAG_ID, TRASH_TAG_NAME } = require('lib/reserved-ids');

// Notes in trash are excluded by default in all methods with options
// To include notes in trash, set the 'includeTrash' option.
// For other methods (ie without options), see the descriptions below.

class Tag extends BaseItem {
	static tableName() {
		return 'tags';
	}

	static modelType() {
		return BaseModel.TYPE_TAG;
	}

	static async itemIds_(tagId, item_id, item_tags, items) {
		let sqlQuery = `SELECT ${item_id} AS id FROM ${item_tags} WHERE tag_id = ?`;
		const sqlParams = [tagId];
		if (tagId !== TRASH_TAG_ID) {
			sqlQuery += ` AND ${item_id} NOT IN (SELECT ${item_id} FROM ${item_tags} WHERE tag_id = ?)`;
			sqlParams.push(TRASH_TAG_ID);
		}
		// this is necessary because note_tags retains record for deleted notes
		sqlQuery += ` AND ${item_id} IN (SELECT id AS ${item_id} FROM ${items})`;
		const rows = await this.db().selectAll(sqlQuery, sqlParams);
		const output = [];
		for (let i = 0; i < rows.length; i++) {
			output.push(rows[i].id);
		}
		return output;
	}

	// This method excludes notes in trash by default, except when tag is trash tag
	static async noteIds(tagId, options = null) {
		if (options && options.includeTrash) throw new Error('Unimplemented option');
		return Tag.itemIds_(tagId, 'note_id', 'note_tags', 'notes');
	}

	// This method excludes notes in trash by default, except when tag is trash tag
	static async folderIds(tagId, options = null) {
		if (options && options.includeTrash) throw new Error('Unimplemented option');
		return Tag.itemIds_(tagId, 'folder_id', 'folder_tags', 'folders');
	}

	// This method excludes notes in trash by default except when tagId == TRASH_TAG_ID
	static async notes(tagId, options = null) {
		if (options === null) options = {};
		if (options.includeTrash) throw new Error('Unimplemented option');

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
	// This method works on all notes including those in trash
	static async untagAll(tagId) {
		const folderTags = await FolderTag.modelSelectAll(
			'SELECT id FROM folder_tags WHERE tag_id = ?', [tagId]);
		if (folderTags.length > 0) { throw new Error('Support for folder tags not implemented'); }

		const noteTags = await NoteTag.modelSelectAll('SELECT id FROM note_tags WHERE tag_id = ?', [tagId]);
		for (let i = 0; i < noteTags.length; i++) {
			await NoteTag.delete(noteTags[i].id);
		}

		await Tag.delete(tagId);
	}

	// The forceDeleteTrashTag option is only intended for testing.
	static async delete(id, options = null) {
		if (!options) options = {};

		if (id === TRASH_TAG_ID && !options.forceDeleteTrashTag) { return; }

		await super.delete(id, options);

		this.dispatch({
			type: 'TAG_DELETE',
			id: id,
		});
	}

	// This method works on all notes including those in trash
	static async addNote(tagId, noteId) {
		if (!(await Note.load(noteId))) { throw new Error(`Note ${noteId} does not exist`); }
		if (!(await Tag.load(tagId))) { throw new Error(`Tag ${tagId} does not exist`); }

		const hasTag = await NoteTag.exists(noteId, tagId);
		if (hasTag) return;

		const output = await NoteTag.save({
			tag_id: tagId,
			note_id: noteId,
		});

		if (tagId === TRASH_TAG_ID)  {
			this.dispatch({
				type: 'NOTE_DELETE',
				id: noteId,
			});
		} else {
			this.dispatch({
				type: 'TAG_UPDATE_ONE',
				item: await Tag.loadWithCount_(tagId),
			});
		}

		return output;
	}

	// This method works on all folders including those in trash
	static async addFolder(tagId, folderId) {
		if (!(await Folder.load(folderId))) { throw new Error(`Folder ${folderId} does not exist`); }
		if (!(await Tag.load(tagId))) { throw new Error(`Tag ${tagId} does not exist`); }

		const hasTag = await FolderTag.exists(folderId, tagId);
		if (hasTag) return;
		const output = await FolderTag.save({
			tag_id: tagId,
			folder_id: folderId,
		});
		if (tagId === TRASH_TAG_ID) {
			this.dispatch({
				type: 'FOLDER_DELETE',
				id: folderId,
			});
		}

		return output;
	}

	static async removeItem_(tagId, itemId, itemTagClass, item_tags, item_id, eventType) {
		const itemTags = await itemTagClass.modelSelectAll(`SELECT id FROM ${item_tags} WHERE tag_id = ? and ${item_id} = ?`, [tagId, itemId]);
		for (let i = 0; i < itemTags.length; i++) {
			await itemTagClass.delete(itemTags[i].id);
		}

		const event = { type: eventType, tag_id: tagId };
		event[item_id] = itemId;
		this.dispatch(event);
	}

	// This method works on all notes including those in trash
	static async removeNote(tagId, noteId) {
		await Tag.removeItem_(tagId, noteId, NoteTag, 'note_tags', 'note_id', 'NOTE_TAG_REMOVE');
	}

	// This method works on all folders including those in trash
	static async removeFolder(tagId, folderId) {
		await Tag.removeItem_(tagId, folderId, FolderTag, 'folder_tags', 'folder_id', 'FOLDER_TAG_REMOVE');
	}

	// This method works on all notes including those in trash
	static async hasItem_(tagId, itemId, item_id, item_tags) {
		const r = await this.db().selectOne(`SELECT ${item_id} FROM ${item_tags} WHERE tag_id = ? AND ${item_id} = ? LIMIT 1`, [tagId, itemId]);
		return !!r;
	}

	// This method works on all notes including those in trash
	static async hasNote(tagId, noteId) {
		return Tag.hasItem_(tagId, noteId, 'note_id', 'note_tags');
	}

	// This method works on all folders including those in trash
	static async hasFolder(tagId, folderId) {
		return Tag.hasItem_(tagId, folderId, 'folder_id', 'folder_tags');
	}

	// This method covers all notes including those in trash
	static loadWithCount_(tagId) {
		const sql = 'SELECT * FROM tags_with_note_count WHERE id = ?';
		return this.modelSelectOne(sql, [tagId]);
	}

	// This method gets all tags excluding the trash tag
	static async all(options = null) {
		let output = await super.all(options);
		if (!options || !options.includeTrash) {
			output = output.filter(tag => tag.id !== TRASH_TAG_ID);
		}
		return output;
	}

	// This method excludes notes in trash
	static async allWithNotes() {
		return await Tag.modelSelectAll('SELECT * FROM tags_with_note_count_exclude_trash');
	}

	// This method excludes notes in trash
	static async searchAllWithNotes(options) {
		if (!options) options = {};
		if (options.includeTrash) throw new Error('Unimplemented option');
		if (!options.conditions) options.conditions = [];
		options.conditions.push('id IN (SELECT distinct id FROM tags_with_note_count_exclude_trash)');
		options.conditions.push(`id <> "${TRASH_TAG_ID}"`);
		return this.search(options);
	}

	// This method works on all notes including those in trash
	static async tagsByNoteId(noteId) {
		const tagIds = await NoteTag.tagIdsByNoteId(noteId);
		return this.modelSelectAll(`SELECT * FROM tags WHERE id IN ("${tagIds.join('","')}")`);
	}

	// This method works on all notes including those in trash
	// It excludes the trash tag from the results
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

	// This method works on all notes including those in trash
	static async loadByTitle(title) {
		return this.loadByField('title', title, { caseInsensitive: true });
	}

	// This method works on all notes including those in trash
	static async addNoteTagByTitle(noteId, tagTitle) {
		let tag = await this.loadByTitle(tagTitle);
		if (!tag) tag = await Tag.save({ title: tagTitle }, { userSideValidation: true });
		return await this.addNote(tag.id, noteId);
	}

	// This method works on all notes including those in trash
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

	// This method works on all notes including those in trash
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
		if ('title' in o && o.title === TRASH_TAG_NAME) {
			if ('id' in o && o.id === TRASH_TAG_ID) {
				const trashTag = await Tag.load(TRASH_TAG_ID);
				if (trashTag) {
					throw new Error('The tag "%s" is reserved.', o.title);
				}
			} else {
				throw new Error(_('The tag "%s" is reserved. Please choose a different name.', o.title));
			}
			if (!('isNew' in options && options.isNew)) {
				throw new Error('The tag "%s" is reserved and must be new.', o.title);
			}
		}
		if (options && options.userSideValidation) {
			if ('title' in o) {
				o.title = o.title.trim().toLowerCase();

				const existingTag = await Tag.loadByTitle(o.title);
				if (existingTag && existingTag.id !== o.id) {
					throw new Error(_('The tag "%s" already exists. Please choose a different name.', o.title));
				}
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
