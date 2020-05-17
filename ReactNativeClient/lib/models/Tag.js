const BaseModel = require('lib/BaseModel.js');
const BaseItem = require('lib/models/BaseItem.js');
const NoteTag = require('lib/models/NoteTag.js');
const Note = require('lib/models/Note.js');
const { nestedPath } = require('lib/nested-utils.js');
const { _ } = require('lib/locale');

class Tag extends BaseItem {
	static tableName() {
		return 'tags';
	}

	static modelType() {
		return BaseModel.TYPE_TAG;
	}

	static async noteIds(tagId) {
		const nestedTagIds = await Tag.descendantTagIds(tagId);
		nestedTagIds.push(tagId);

		const rows = await this.db().selectAll(`SELECT note_id FROM note_tags WHERE tag_id IN ("${nestedTagIds.join('","')}")`);
		const output = [];
		for (let i = 0; i < rows.length; i++) {
			const noteId = rows[i].note_id;
			if (output.includes(noteId)) {
				continue;
			}
			output.push(noteId);
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

	static async descendantTagIds(parentId) {
		const descendantIds = [];
		let childrenIds = await Tag.childrenTagIds(parentId);
		for (let i = 0; i < childrenIds.length; i++) {
			const childId = childrenIds[i];
			descendantIds.push(childId);
			childrenIds = childrenIds.concat(await Tag.childrenTagIds(childId));
		}
		return descendantIds;
	}

	// Untag all the notes and delete tag
	static async untagAll(tagId, options = null) {
		if (!options) options = {};
		if (!('deleteChildren' in options)) options.deleteChildren = true;

		const tag = await Tag.load(tagId);
		if (!tag) return; // noop

		if (options.deleteChildren) {
			const childrenTagIds = await Tag.childrenTagIds(tagId);
			for (let i = 0; i < childrenTagIds.length; i++) {
				await Tag.untagAll(childrenTagIds[i]);
			}
		}

		const noteTags = await NoteTag.modelSelectAll('SELECT id FROM note_tags WHERE tag_id = ?', [tagId]);
		for (let i = 0; i < noteTags.length; i++) {
			await NoteTag.delete(noteTags[i].id);
		}

		await Tag.delete(tagId);
	}

	static async delete(id, options = null) {
		if (!options) options = {};
		if (!('deleteChildren' in options)) options.deleteChildren = true;
		if (!('deleteNotelessParents' in options)) options.deleteNotelessParents = true;

		const tag = await Tag.load(id);
		if (!tag) return; // noop

		// Delete children tags
		if (options.deleteChildren) {
			const childrenTagIds = await Tag.childrenTagIds(id);
			for (let i = 0; i < childrenTagIds.length; i++) {
				await Tag.delete(childrenTagIds[i]);
			}
		}

		await super.delete(id, options);

		// Delete ancestor tags that do not have any associated notes left
		if (options.deleteNotelessParents && tag.parent_id) {
			const parent = await Tag.loadWithCount(tag.parent_id);
			if (!parent) {
				await Tag.delete(tag.parent_id, options);
			}
		}

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

	static async addNoteCounts(tags) {
		for (const tag of tags) {
			const noteIds = await Tag.noteIds(tag.id);
			// Make sure the notes exist
			const notes = await Note.byIds(noteIds);
			tag.note_count = notes.length;
		}
	}

	static async loadWithCount(tagId) {
		const tag = await Tag.load(tagId);
		if (!tag) return;

		const noteIds = await Tag.noteIds(tagId);
		// Make sure the notes exist
		tag.note_count = (await Note.byIds(noteIds)).length;
		if (tag.note_count === 0) return;

		return tag;
	}

	static async hasNote(tagId, noteId) {
		const r = await this.db().selectOne('SELECT note_id FROM note_tags WHERE tag_id = ? AND note_id = ? LIMIT 1', [tagId, noteId]);
		return !!r;
	}

	static async allWithNotes() {
		let tags = await Tag.all();
		await Tag.addNoteCounts(tags);

		tags = tags.filter((tag) => tag.note_count > 0);
		return tags;
	}

	static async searchAllWithNotes(options) {
		const tags = this.search(options);
		await Tag.addNoteCounts(tags);

		tags.filter((tag) => tag.note_count > 0);
		return tags;
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
		if (!tag) tag = await Tag.saveNested({ title: tagTitle }, { userSideValidation: true });
		return await this.addNote(tag.id, noteId);
	}

	static async setNoteTagsByTitles(noteId, tagTitles) {
		const previousTags = await this.tagsByNoteId(noteId);
		const addedTitles = [];

		for (let i = 0; i < tagTitles.length; i++) {
			const title = tagTitles[i].trim().toLowerCase();
			if (!title) continue;
			let tag = await this.loadByTitle(title);
			if (!tag) tag = await Tag.saveNested({ title: title }, { userSideValidation: true  });
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
		return nestedPath(tags, tagId);
	}

	static displayTitle(item) {
		const title = super.displayTitle(item);
		const separator = '/';
		const i = title.lastIndexOf(separator);
		if (i !== -1) return title.slice(i + separator.length);
		return title;
	}

	static async changeDescendantPrefix(parentItem, parentPrefix) {
		const childrenTagIds = await Tag.childrenTagIds(parentItem.id);
		for (let i = 0; i < childrenTagIds.length; i++) {
			const childItem = await Tag.load(childrenTagIds[i]);
			// The new title of the child is new prefix + display name
			const childName = `${parentPrefix}/${await Tag.displayTitle(childItem)}`;
			childItem.title = childName;
			// Change the child title
			await Tag.save(childItem, { fields: ['title'] });
			// Change descendant titles
			await Tag.changeDescendantPrefix(childItem, childName);
		}
	}

	static async rename(tag, newTitle) {
		const oldParentId = tag.parent_id;

		tag.title = newTitle;
		tag = await Tag.saveNested(tag, { fields: ['title', 'parent_id'], userSideValidation: true });
		await Tag.changeDescendantPrefix(tag, newTitle);

		if (oldParentId !== tag.parent_id) {
			// If the parent tag has changed, and the ancestor doesn't
			// have notes attached, then remove it
			const oldParentWithCount = await Tag.loadWithCount(oldParentId);
			if (!oldParentWithCount) {
				await Tag.delete(oldParentId, { deleteChildren: false, deleteNotelessParents: true });
			}
		}
		return tag;
	}

	static async moveTag(tagId, parentTagId) {
		if (tagId === parentTagId
				|| (await Tag.descendantTagIds(tagId)).includes(parentTagId)) {
			throw new Error(_('Cannot move tag to this location'));
		}

		const tag = await Tag.load(tagId);
		if (!tag) return;
		let tagTitle = await Tag.displayTitle(tag);

		const parentTag = await Tag.load(parentTagId);
		if (parentTag) {
			tagTitle = `${parentTag.title}/${tagTitle}`;
		}

		return await Tag.rename(tag, tagTitle);
	}

	static async saveNested(tag, options) {
		if (!options) options = {};
		// The following option is used to prevent loops in the tag hierarchy
		if (!('mainTagId' in options) && tag.id) options.mainTagId = tag.id;

		let parentId = '';
		// Check if the tag is nested using `/` as separator
		const separator = '/';
		const i = tag.title.lastIndexOf(separator);
		if (i !== -1) {
			const parentTitle = tag.title.slice(0,i);

			// Try to get the parent tag
			const parentTag = await Tag.loadByTitle(parentTitle);
			// The second part of the conditions ensures that we do not create a loop
			// in the tag hierarchy
			if (parentTag &&
				!('mainTagId' in options
					&& (options.mainTagId === parentTag.id
						|| (await Tag.descendantTagIds(options.mainTagId)).includes(parentTag.id)))
			) {
				parentId = parentTag.id;
			} else {
				// Create the parent tag if it doesn't exist
				const parentOpts = {};
				if ('mainTagId' in options) parentOpts.mainTagId = options.mainTagId;
				const parentTag = await Tag.saveNested({ title: parentTitle }, parentOpts);
				parentId = parentTag.id;
			}
		}

		// Set parent_id
		tag.parent_id = parentId;
		return await Tag.save(tag, options);
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
