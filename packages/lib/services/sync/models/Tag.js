"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseModel_1 = require("../BaseModel");
const BaseItem_1 = require("./BaseItem");
const NoteTag_1 = require("./NoteTag");
const Note_1 = require("./Note");
const locale_1 = require("../locale");
const ActionLogger_1 = require("../utils/ActionLogger");
class Tag extends BaseItem_1.default {
    static tableName() {
        return 'tags';
    }
    static modelType() {
        return BaseModel_1.default.TYPE_TAG;
    }
    static async noteIds(tagId) {
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
    static async notes(tagId, options = null) {
        if (options === null)
            options = {};
        const noteIds = await this.noteIds(tagId);
        if (!noteIds.length)
            return [];
        return Note_1.default.previews(null, Object.assign(Object.assign({}, options), { conditions: [`id IN (${this.escapeIdsForSql(noteIds)})`] }));
    }
    // Untag all the notes and delete tag
    static async untagAll(tagId) {
        const noteTags = await NoteTag_1.default.modelSelectAll('SELECT id FROM note_tags WHERE tag_id = ?', [tagId]);
        for (let i = 0; i < noteTags.length; i++) {
            await NoteTag_1.default.delete(noteTags[i].id, { sourceDescription: 'untagAll/disassociate note' });
        }
        await Tag.delete(tagId, { sourceDescription: 'untagAll/delete tag' });
    }
    static async delete(id, options = {}) {
        const actionLogger = ActionLogger_1.default.from(options.sourceDescription);
        const tagTitle = (await Tag.load(id)).title;
        actionLogger.addDescription(`tag title: ${JSON.stringify(tagTitle)}`);
        options = Object.assign(Object.assign({}, options), { sourceDescription: actionLogger });
        await super.delete(id, options);
        this.dispatch({
            type: 'TAG_DELETE',
            id: id,
        });
    }
    static async addNote(tagId, noteId) {
        const hasIt = await this.hasNote(tagId, noteId);
        if (hasIt)
            return;
        const output = await NoteTag_1.default.save({
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
    static async removeNote(tagId, noteId) {
        const tag = await Tag.load(tagId);
        const actionLogger = ActionLogger_1.default.from(`Tag/removeNote - tag: ${tag.title}`);
        const noteTags = await NoteTag_1.default.modelSelectAll('SELECT id FROM note_tags WHERE tag_id = ? and note_id = ?', [tagId, noteId]);
        for (let i = 0; i < noteTags.length; i++) {
            await NoteTag_1.default.delete(noteTags[i].id, { sourceDescription: actionLogger.clone() });
        }
        this.dispatch({
            type: 'NOTE_TAG_REMOVE',
            item: tag,
        });
    }
    static loadWithCount(tagId) {
        const sql = 'SELECT * FROM tags_with_note_count WHERE id = ?';
        return this.modelSelectOne(sql, [tagId]);
    }
    static async hasNote(tagId, noteId) {
        const r = await this.db().selectOne(`
			SELECT note_id
			FROM note_tags
			LEFT JOIN notes ON notes.id = note_tags.note_id
			WHERE tag_id = ? AND note_id = ? AND deleted_time = 0
			LIMIT 1
		`, [tagId, noteId]);
        return !!r;
    }
    static async allWithNotes() {
        return await Tag.modelSelectAll('SELECT * FROM tags_with_note_count');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async searchAllWithNotes(options) {
        if (!options)
            options = {};
        if (!options.conditions)
            options.conditions = [];
        options.conditions.push('id IN (SELECT distinct id FROM tags_with_note_count)');
        return this.search(options);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async tagsByNoteId(noteId, options = null) {
        options = Object.assign({}, options);
        const tagIds = await NoteTag_1.default.tagIdsByNoteId(noteId);
        if (!tagIds.length)
            return [];
        return this.modelSelectAll(`SELECT ${options.fields ? this.db().escapeFields(options.fields) : '*'} FROM tags WHERE id IN (${this.escapeIdsForSql(tagIds)})`);
    }
    static async commonTagsByNoteIds(noteIds) {
        if (!noteIds || noteIds.length === 0) {
            return [];
        }
        let commonTagIds = await NoteTag_1.default.tagIdsByNoteId(noteIds[0]);
        for (let i = 1; i < noteIds.length; i++) {
            const tagIds = await NoteTag_1.default.tagIdsByNoteId(noteIds[i]);
            commonTagIds = commonTagIds.filter(value => tagIds.includes(value));
            if (commonTagIds.length === 0) {
                break;
            }
        }
        return this.modelSelectAll(`SELECT * FROM tags WHERE id IN (${this.escapeIdsForSql(commonTagIds)})`);
    }
    static async loadByTitle(title) {
        // Case insensitive doesn't work with special Unicode characters like Ö, but as these characters are no longer converted to lowercase on save, this is ok
        // For the original issue, see https://github.com/laurent22/joplin/issues/11179
        return this.loadByField('title', title, { caseInsensitive: true });
    }
    static async addNoteTagByTitle(noteId, tagTitle) {
        let tag = await this.loadByTitle(tagTitle);
        if (!tag)
            tag = await Tag.save({ title: tagTitle }, { userSideValidation: true });
        return await this.addNote(tag.id, noteId);
    }
    static async setNoteTagsByTitles(noteId, tagTitles) {
        // We still compare lowercased tag titles here, so that special unicode characters will match regardless of case. But this won't stop the user from renaming
        // a tag to a title which matches another tag except for one or more special unicode characters having a different case. But this seems a reasonable compromise
        // due to the lack of native case insensitive text comparison functionality for special unicode characters in sqlite without any extensions
        const previousTags = await this.tagsByNoteId(noteId);
        const addedTitlesLowercased = [];
        for (let i = 0; i < tagTitles.length; i++) {
            const title = tagTitles[i].trim();
            if (!title)
                continue;
            let tag = await this.loadByTitle(title);
            if (!tag)
                tag = await Tag.save({ title: title }, { userSideValidation: true });
            await this.addNote(tag.id, noteId);
            addedTitlesLowercased.push(title.toLowerCase());
        }
        for (let i = 0; i < previousTags.length; i++) {
            if (addedTitlesLowercased.indexOf(previousTags[i].title.toLowerCase()) < 0) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    static async save(o, options = null) {
        options = Object.assign({ dispatchUpdateAction: true, userSideValidation: false }, options);
        if (options.userSideValidation) {
            if ('title' in o) {
                o.title = o.title.trim();
                const existingTag = await Tag.loadByTitle(o.title);
                if (existingTag && existingTag.id !== o.id)
                    throw new Error((0, locale_1._)('The tag "%s" already exists. Please choose a different name.', o.title));
            }
        }
        // eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
        return super.save(o, options).then((tag) => {
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
exports.default = Tag;
