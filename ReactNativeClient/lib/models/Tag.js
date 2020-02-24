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
		// Get NoteIds of that are tagged with current tag or its descendants
		const rows = await this.db().selectAll(`WITH RECURSIVE
												parent_of(id, child_id) AS 
												(SELECT id, id FROM tags where id=?
												UNION ALL
												SELECT parent_of.id, tags2.id FROM parent_of JOIN tags AS tags2 ON parent_of.child_id=tags2.parent_id)
												SELECT note_id FROM note_tags WHERE tag_id IN (SELECT child_id from parent_of)`, [tagId]);
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

	static async childrenTagIds(parentId) {
		const rows = await this.db().selectAll('SELECT id FROM tags WHERE parent_id = ?', [parentId]);
		return rows.map(r => r.id);
	}

	// Untag all the notes and delete tag
	static async untagAll(tagId, options = null) {
		if (!options) options = {};
		if (!('deleteChildren' in options)) options.deleteChildren = true;

		let tag = await Tag.load(tagId);
		if (!tag) return; // noop

		if (options.deleteChildren) {
			let childrenTagIds = await Tag.childrenTagIds(tagId);
			for (let i = 0; i < childrenTagIds.length; i++) {
				await Tag.untagAll(childrenTagIds[i]);
			}
		}

		const noteTags = await NoteTag.modelSelectAll('SELECT id FROM note_tags WHERE tag_id = ?', [tagId]);
		for (let i = 0; i < noteTags.length; i++) {
			await NoteTag.delete(noteTags[i].id);
		}

		// We're recursing over all children already, so this call doesn't have to be recursive.
		await Tag.delete(tagId, { deleteChildren: false });
	}

	static async delete(id, options = null) {
		if (!options) options = {};
		if (!('deleteChildren' in options)) options.deleteChildren = true;

		let tag = await Tag.load(id);
		if (!tag) return; // noop

		if (options.deleteChildren) {
			let childrenTagIds = await Tag.childrenTagIds(id);
			for (let i = 0; i < childrenTagIds.length; i++) {
				await Tag.delete(childrenTagIds[i]);
			}
		}

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

	static tagPath(tags, tagId) {
		const idToTags = {};
		for (let i = 0; i < tags.length; i++) {
			idToTags[tags[i].id] = tags[i];
		}

		const path = [];
		while (tagId) {
			const tag = idToTags[tagId];
			if (!tag) break; // Shouldn't happen
			path.push(tag);
			tagId = tag.parent_id;
		}

		path.reverse();

		return path;
	}

	static displayTitle(item) {
		let title = super.displayTitle(item);
		const separator = '/';
		const i = title.lastIndexOf(separator);
		if (i !== -1) return title.slice(i+separator.length);
		return title;
	}

	static async save(o, options = null) {
		if (!options) options = {};
		if (!('createParents' in options)) options.createParents = true;
		if (!('selectNoteTag' in options)) options.selectNoteTag = true;

		if (options && options.userSideValidation) {
			if ('title' in o) {
				o.title = o.title.trim().toLowerCase();

				const existingTag = await Tag.loadByTitle(o.title);
				if (existingTag && existingTag.id !== o.id) throw new Error(_('The tag "%s" already exists. Please choose a different name.', o.title));
			}
		}
		let parentId = '';
		let parentTitle = '';
		if ('title' in o) {
			// Check if the tag is nested using `/` as separator
			const separator = '/';
			const i = o.title.lastIndexOf(separator);
			if (i !== -1) {
				parentTitle = o.title.slice(0,i);

				// Try to get the parent tag
				let parentTag = await Tag.loadByTitle(parentTitle);
				if (parentTag) parentId = parentTag.id;
			}
		}
		if (options && options.createParents && parentTitle && !parentId) {
			// Create the parent tag if it doesn't exist
			let parent = {};
			Object.assign(parent, o);
			parent.title = parentTitle;
			// Do not select the parent note_tags
			let parent_opts = {};
			Object.assign(parent_opts, options);
			parent_opts.selectNoteTag = false;
			const parentTag = await Tag.save(parent, parent_opts);
			parentId = parentTag.id;
		}

		// Set parent_id
		o.parent_id = parentId;

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
