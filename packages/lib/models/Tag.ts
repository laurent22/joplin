import { TagEntity, TagsWithNoteCountEntity } from '../services/database/types';

import BaseModel, { DeleteOptions } from '../BaseModel';
import BaseItem from './BaseItem';
import NoteTag from './NoteTag';
import Note from './Note';
import { _ } from '../locale';
import ActionLogger from '../utils/ActionLogger';

export default class Tag extends BaseItem {
	public static tableName() {
		return 'tags';
	}

	public static modelType() {
		return BaseModel.TYPE_TAG;
	}

	public static async noteIds(tagId: string) {
		const rows = await this.db().selectAll(`
			SELECT note_id
			FROM note_tags
			LEFT JOIN notes ON notes.id = note_tags.note_id
			WHERE tag_id = ? AND notes.deleted_time = 0
		`, [tagId]);
		const output = [];
		for (let i = 0; i < rows.length; i++) {
			output.push(rows[i].note_id);
		}
		return output;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static async notes(tagId: string, options: any = null) {
		if (options === null) options = {};

		const noteIds = await this.noteIds(tagId);
		if (!noteIds.length) return [];

		return Note.previews(
			null,
			{ ...options, conditions: [`id IN (${this.escapeIdsForSql(noteIds)})`] },
		);
	}

	// Untag all the notes and delete tag
	public static async untagAll(tagId: string) {
		const noteTags = await NoteTag.modelSelectAll('SELECT id FROM note_tags WHERE tag_id = ?', [tagId]);
		for (let i = 0; i < noteTags.length; i++) {
			await NoteTag.delete(noteTags[i].id, { sourceDescription: 'untagAll/disassociate note' });
		}

		await Tag.delete(tagId, { sourceDescription: 'untagAll/delete tag' });
	}

	public static async delete(id: string, options: DeleteOptions = {}) {
		const actionLogger = ActionLogger.from(options.sourceDescription);
		const tagTitle = (await Tag.load(id)).title;
		actionLogger.addDescription(`tag title: ${JSON.stringify(tagTitle)}`);

		options = {
			...options,
			sourceDescription: actionLogger,
		};

		await super.delete(id, options);

		this.dispatch({
			type: 'TAG_DELETE',
			id: id,
		});
	}

	public static async addNote(tagId: string, noteId: string) {
		const hasIt = await this.hasNote(tagId, noteId);
		if (hasIt) return;

		const output = await NoteTag.save({
			tag_id: tagId,
			note_id: noteId,
		});

		// While syncing or importing notes, the app might associate a tag ID with a note ID
		// but the actual items might not have been downloaded yet, so
		// check that we actually get some result before dispatching
		// the action.
		//
		// Fixes: https://github.com/laurent22/joplin/issues/3958#issuecomment-714320526
		//
		// Also probably fixes the errors on GitHub about reducer
		// items being undefined.
		const tagWithCount = await Tag.loadWithCount(tagId);

		if (tagWithCount) {
			this.dispatch({
				type: 'TAG_UPDATE_ONE',
				item: tagWithCount,
			});
		}

		return output;
	}

	public static async removeNote(tagId: string, noteId: string) {
		const tag = await Tag.load(tagId);

		const actionLogger = ActionLogger.from(`Tag/removeNote - tag: ${tag.title}`);

		const noteTags = await NoteTag.modelSelectAll('SELECT id FROM note_tags WHERE tag_id = ? and note_id = ?', [tagId, noteId]);
		for (let i = 0; i < noteTags.length; i++) {
			await NoteTag.delete(noteTags[i].id, { sourceDescription: actionLogger.clone() });
		}

		this.dispatch({
			type: 'NOTE_TAG_REMOVE',
			item: tag,
		});
	}

	public static loadWithCount(tagId: string) {
		const sql = 'SELECT * FROM tags_with_note_count WHERE id = ?';
		return this.modelSelectOne(sql, [tagId]);
	}

	public static async hasNote(tagId: string, noteId: string) {
		const r = await this.db().selectOne(`
			SELECT note_id
			FROM note_tags
			LEFT JOIN notes ON notes.id = note_tags.note_id
			WHERE tag_id = ? AND note_id = ? AND deleted_time = 0
			LIMIT 1
		`, [tagId, noteId]);
		return !!r;
	}

	public static async allWithNotes(): Promise<TagsWithNoteCountEntity[]> {
		return await Tag.modelSelectAll('SELECT * FROM tags_with_note_count');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static async searchAllWithNotes(options: any) {
		if (!options) options = {};
		if (!options.conditions) options.conditions = [];
		options.conditions.push('id IN (SELECT distinct id FROM tags_with_note_count)');
		return this.search(options);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static async tagsByNoteId(noteId: string, options: any = null) {
		options = {
			...options,
		};

		const tagIds = await NoteTag.tagIdsByNoteId(noteId);
		if (!tagIds.length) return [];
		return this.modelSelectAll(`SELECT ${options.fields ? this.db().escapeFields(options.fields) : '*'} FROM tags WHERE id IN (${this.escapeIdsForSql(tagIds)})`);
	}

	public static async commonTagsByNoteIds(noteIds: string[]) {
		if (!noteIds || noteIds.length === 0) {
			return [];
		}
		let commonTagIds: string[] = await NoteTag.tagIdsByNoteId(noteIds[0]);
		for (let i = 1; i < noteIds.length; i++) {
			const tagIds = await NoteTag.tagIdsByNoteId(noteIds[i]);
			commonTagIds = commonTagIds.filter(value => tagIds.includes(value));
			if (commonTagIds.length === 0) {
				break;
			}
		}
		return this.modelSelectAll(`SELECT * FROM tags WHERE id IN (${this.escapeIdsForSql(commonTagIds)})`);
	}

	public static async loadByTitle(title: string): Promise<TagEntity> {
		// Case insensitive doesn't work with especial Unicode characters like Ö
		const lowercaseTitle = title.toLowerCase();
		return this.loadByField('title', lowercaseTitle, { caseInsensitive: true });
	}

	public static async addNoteTagByTitle(noteId: string, tagTitle: string) {
		let tag = await this.loadByTitle(tagTitle);
		if (!tag) tag = await Tag.save({ title: tagTitle }, { userSideValidation: true });
		return await this.addNote(tag.id, noteId);
	}

	public static async setNoteTagsByTitles(noteId: string, tagTitles: string[]) {
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

	public static async setNoteTagsByIds(noteId: string, tagIds: string[]) {
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static async save(o: TagEntity, options: any = null) {
		options = { dispatchUpdateAction: true,
			userSideValidation: false, ...options };

		if (options.userSideValidation) {
			if ('title' in o) {
				o.title = o.title.trim().toLowerCase();

				const existingTag = await Tag.loadByTitle(o.title);
				if (existingTag && existingTag.id !== o.id) throw new Error(_('The tag "%s" already exists. Please choose a different name.', o.title));
			}
		}

		// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
		return super.save(o, options).then((tag: TagEntity) => {
			if (options.dispatchUpdateAction) {
				this.dispatch({
					type: 'TAG_UPDATE_ONE',
					item: tag,
				});
			}

			return tag;
		});
	}
}
