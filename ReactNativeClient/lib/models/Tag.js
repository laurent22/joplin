const BaseModel = require('lib/BaseModel.js');
const BaseItem = require('lib/models/BaseItem.js');
const NoteTag = require('lib/models/NoteTag.js');
const Note = require('lib/models/Note.js');
const { nestedPath } = require('lib/nested-utils.js');
const { _ } = require('lib/locale');

// fullTitle cache, which defaults to ''
const fullTitleCache = new Proxy({}, {
	get: function(cache, id) {
		return cache.hasOwnProperty(id) ? cache[id] : '';
	},
	set: function(cache, id, value) {
		cache[id] = value;
		return true;
	},
});

// noteCount cache
const noteCountCache = {};

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

	static async noteCount(tagId) {
		const noteIds = await Tag.noteIds(tagId);
		// Make sure the notes exist
		const notes = await Note.byIds(noteIds);
		return notes.length;
	}

	static async updateCachedNoteCountForIds(tagIds) {
		const tags = await Tag.byIds(tagIds);
		for (let i = 0; i < tags.length; i++) {
			if (!tags[i]) continue;
			noteCountCache[tags[i].id] = await Tag.noteCount(tags[i].id);
		}
	}

	static getCachedNoteCount(tagId) {
		return noteCountCache[tagId];
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
			// Fail-safe in case of a loop in the tag hierarchy.
			if (descendantIds.includes(childId)) continue;

			descendantIds.push(childId);
			childrenIds = childrenIds.concat(await Tag.childrenTagIds(childId));
		}
		return descendantIds;
	}

	static async ancestorTags(tag) {
		const ancestorIds = [];
		const ancestors = [];
		while (tag.parent_id != '') {
			// Fail-safe in case of a loop in the tag hierarchy.
			if (ancestorIds.includes(tag.parent_id)) break;

			tag = await Tag.load(tag.parent_id);
			// Fail-safe in case a parent isn't there
			if (!tag) break;
			ancestorIds.push(tag.id);
			ancestors.push(tag);
		}
		ancestors.reverse();
		return ancestors;
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

		// Update note counts
		const tagIdsToUpdate = await Tag.ancestorTags(tagId);
		tagIdsToUpdate.push(tagId);
		await Tag.updateCachedNoteCountForIds(tagIdsToUpdate);

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

		// Update note counts
		const tagIdsToUpdate = await Tag.ancestorTags(tagId);
		tagIdsToUpdate.push(tagId);
		await Tag.updateCachedNoteCountForIds(tagIdsToUpdate);

		this.dispatch({
			type: 'NOTE_TAG_REMOVE',
			item: await Tag.load(tagId),
		});
	}

	static async updateCachedFullTitleForIds(tagIds) {
		const tags = await Tag.byIds(tagIds);
		for (let i = 0; i < tags.length; i++) {
			if (!tags[i]) continue;
			fullTitleCache[tags[i].id] = await Tag.getFullTitle(tags[i]);
		}
	}

	static getCachedFullTitle(tagId) {
		return fullTitleCache[tagId];
	}

	static async getFullTitle(tag) {
		const ancestorTags = await Tag.ancestorTags(tag);
		ancestorTags.push(tag);
		const ancestorTitles = ancestorTags.map((t) => t.title);
		return ancestorTitles.join('/');
	}

	static async load(id, options = null) {
		const tag = await super.load(id, options);
		if (!tag) return;
		// Update noteCount cache
		noteCountCache[tag.id] = await Tag.noteCount(tag.id);
		return tag;
	}

	static async all(options = null) {
		const tags = await super.all(options);

		for (const tag of tags) {
			const tagPath = Tag.tagPath(tags, tag.id);
			const pathTitles = tagPath.map((t) => t.title);
			const fullTitle = pathTitles.join('/');
			// When all tags are reloaded we can also cheaply update the cache
			fullTitleCache[tag.id] = fullTitle;
		}

		// Update noteCount cache
		const tagIds = tags.map((tag) => tag.id);
		await Tag.updateCachedNoteCountForIds(tagIds);

		return tags;
	}

	static async loadWithCount(tagId) {
		const tag = await Tag.load(tagId);
		if (!tag) return;

		// Make tag has notes
		if ((await Tag.getCachedNoteCount(tagId)) === 0) return;
		return tag;
	}

	static async hasNote(tagId, noteId) {
		const r = await this.db().selectOne('SELECT note_id FROM note_tags WHERE tag_id = ? AND note_id = ? LIMIT 1', [tagId, noteId]);
		return !!r;
	}

	static async allWithNotes() {
		let tags = await Tag.all();

		tags = tags.filter((tag) => Tag.getCachedNoteCount(tag.id) > 0);
		return tags;
	}

	static async search(options) {
		let tags = await super.search(options);

		// Apply fullTitleRegex on the full_title
		if (options && options.fullTitleRegex) {
			const titleRE = new RegExp(options.fullTitleRegex);
			tags = tags.filter((tag) => Tag.getCachedFullTitle(tag.id).match(titleRE));
		}

		return tags;
	}

	static async tagsByNoteId(noteId) {
		const tagIds = await NoteTag.tagIdsByNoteId(noteId);
		const tags = await this.allWithNotes();
		return tags.filter((tag) => tagIds.includes(tag.id));
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
		const tags = await this.allWithNotes();
		return tags.filter((tag) => commonTagIds.includes(tag.id));
	}

	static async loadByTitle(title) {
		// When loading by title we need to verify that the path from parent to child exists
		const sql = `SELECT * FROM \`${this.tableName()}\` WHERE title = ? and parent_id = ? COLLATE NOCASE`;
		const separator = '/';
		let i = title.indexOf(separator);
		let parentId = '';
		let restTitle = title;
		while (i !== -1) {
			const ancestorTitle = restTitle.slice(0,i);
			restTitle = restTitle.slice(i + 1);

			const ancestorTag = await this.modelSelectOne(sql, [ancestorTitle, parentId]);
			if (!ancestorTag) return;
			parentId = ancestorTag.id;

			i = restTitle.indexOf(separator);
		}
		const tag = await this.modelSelectOne(sql, [restTitle, parentId]);
		if (tag) {
			fullTitleCache[tag.id] = await Tag.getFullTitle(tag);
		}
		return tag;
	}

	static async addNoteTagByTitle(noteId, tagTitle) {
		let tag = await this.loadByTitle(tagTitle);
		if (!tag) tag = await Tag.saveNested({}, tagTitle, { userSideValidation: true });
		return await this.addNote(tag.id, noteId);
	}

	static async setNoteTagsByTitles(noteId, tagTitles) {
		const previousTags = await this.tagsByNoteId(noteId);
		const addedTitles = [];

		for (let i = 0; i < tagTitles.length; i++) {
			const title = tagTitles[i].trim().toLowerCase();
			if (!title) continue;
			let tag = await this.loadByTitle(title);
			if (!tag) tag = await Tag.saveNested({}, title, { userSideValidation: true  });
			await this.addNote(tag.id, noteId);
			addedTitles.push(title);
		}

		for (let i = 0; i < previousTags.length; i++) {
			if (addedTitles.indexOf(Tag.getCachedFullTitle(previousTags[i].id).toLowerCase()) < 0) {
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

	static async moveTag(tagId, parentTagId) {
		if (tagId === parentTagId
				|| (await Tag.descendantTagIds(tagId)).includes(parentTagId)) {
			throw new Error(_('Cannot move tag to this location.'));
		}
		if (!parentTagId) parentTagId = '';

		const tag = await Tag.load(tagId);
		if (!tag) return;

		const oldParentTagId = tag.parent_id;
		// Save new parent id
		const newTag = await Tag.save({ id: tag.id, parent_id: parentTagId }, { userSideValidation: true });

		if (parentTagId !== oldParentTagId) {
			// If the parent tag has changed, and the ancestor doesn't
			// have notes attached, then remove it
			const oldParentWithCount = await Tag.loadWithCount(oldParentTagId);
			if (!oldParentWithCount) {
				await Tag.delete(oldParentTagId, { deleteChildren: false, deleteNotelessParents: true });
			}
		}

		return newTag;
	}

	static async renameNested(tag, newTitle) {
		const oldParentId = tag.parent_id;

		tag = await Tag.saveNested(tag, newTitle, { fields: ['title', 'parent_id'], userSideValidation: true });

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

	static async saveNested(tag, fullTitle, options) {
		if (!options) options = {};
		// The following option is used to prevent loops in the tag hierarchy
		if (!('mainTagId' in options) && tag.id) options.mainTagId = tag.id;

		if (fullTitle.startsWith('/') || fullTitle.endsWith('/')) {
			throw new Error(_('Tag name cannot start or end with a `/`.'));
		} else if (fullTitle.includes('//')) {
			throw new Error(_('Tag name cannot contain `//`.'));
		}

		const newTag = Object.assign({}, tag);
		let parentId = '';
		// Check if the tag is nested using `/` as separator
		const separator = '/';
		const i = fullTitle.lastIndexOf(separator);
		if (i !== -1) {
			const parentTitle = fullTitle.slice(0,i);
			newTag.title = fullTitle.slice(i + 1);

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
				const parentTag = await Tag.saveNested({}, parentTitle, parentOpts);
				parentId = parentTag.id;
			}
		} else {
			// Tag is not nested so set the title to full title
			newTag.title = fullTitle;
		}

		// Set parent_id
		newTag.parent_id = parentId;
		return await Tag.save(newTag, options);
	}

	static async save(o, options = null) {
		if (options && options.userSideValidation) {
			if ('title' in o) {
				o.title = o.title.trim().toLowerCase();

				// Check that a tag with the same title does not already exist at the same level
				let parentId = o.parent_id;
				if (!parentId) parentId = '';
				const existingCurrentLevelTags = await Tag.byIds(await Tag.childrenTagIds(parentId));
				const existingTag = existingCurrentLevelTags.find((t) => t.title === o.title);
				if (existingTag && existingTag.id !== o.id) {
					const fullTitle = await Tag.getFullTitle(existingTag);
					throw new Error(_('The tag "%s" already exists. Please choose a different name.', fullTitle));
				}
			}
		}

		const tag = await super.save(o, options).then(tag => {
			this.dispatch({
				type: 'TAG_UPDATE_ONE',
				item: tag,
			});
			return tag;
		});

		// Update fullTitleCache cache
		const tagIdsToUpdate = await Tag.descendantTagIds(tag.id);
		tagIdsToUpdate.push(tag.id);
		await Tag.updateCachedFullTitleForIds(tagIdsToUpdate);

		return tag;
	}
}

module.exports = Tag;
