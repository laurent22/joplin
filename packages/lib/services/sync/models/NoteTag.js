"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseItem_1 = require("./BaseItem");
const BaseModel_1 = require("../BaseModel");
class NoteTag extends BaseItem_1.default {
    static tableName() {
        return 'note_tags';
    }
    static modelType() {
        return BaseModel_1.default.TYPE_NOTE_TAG;
    }
    static async byNoteIds(noteIds) {
        if (!noteIds.length)
            return [];
        return this.modelSelectAll(`SELECT * FROM note_tags WHERE note_id IN (${this.escapeIdsForSql(noteIds)})`);
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
exports.default = NoteTag;
