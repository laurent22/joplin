import BaseItem from './BaseItem';
import BaseModel, { DeleteOptions } from '../BaseModel';
import Tag from './Tag';

export default class NoteTag extends BaseItem {
	public static tableName() {
		return 'note_tags';
	}

	public static modelType() {
		return BaseModel.TYPE_NOTE_TAG;
	}

	public static async byNoteIds(noteIds: string[]) {
		if (!noteIds.length) return [];
		return this.modelSelectAll(`SELECT * FROM note_tags WHERE note_id IN (${this.escapeIdsForSql(noteIds)})`);
	}

	public static async tagIdsByNoteId(noteId: string) {
		const rows = await this.db().selectAll('SELECT tag_id FROM note_tags WHERE note_id = ?', [noteId]);
		const output = [];
		for (let i = 0; i < rows.length; i++) {
			output.push(rows[i].tag_id);
		}
		return output;
	}

	public static async deleteForNote(noteIds: string | string[], options: DeleteOptions) {
		const ids = Array.isArray(noteIds) ? noteIds : [noteIds];
		const noteTags = await this.byNoteIds(ids);
		const usedTagIds = (await this.modelSelectAll(`SELECT DISTINCT tag_id FROM note_tags WHERE note_id IN (${this.escapeIdsForSql(ids)})`)).map(item => item.tag_id);
		await this.batchDelete(noteTags.map(item => item.id), options);

		const unusedTagIds = (await this.modelSelectAll(`
			SELECT id FROM tags
			WHERE id IN (${this.escapeIdsForSql(usedTagIds)})
			AND id NOT IN (SELECT tag_id FROM note_tags WHERE tag_id IN (${this.escapeIdsForSql(usedTagIds)}))
		`)).map(item => item.id);
		await Tag.batchDelete(unusedTagIds, options);
	}
}
