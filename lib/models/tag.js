import { BaseModel } from 'lib/base-model.js';
import { Database } from 'lib/database.js';
import { BaseItem } from 'lib/models/base-item.js';
import lodash  from 'lodash';

class Tag extends BaseItem {

	static tableName() {
		return 'tags';
	}

	static itemType() {
		return BaseModel.MODEL_TYPE_TAG;
	}

	static async serialize(item, type = null, shownKeys = null) {
		let fieldNames = this.fieldNames();
		fieldNames.push('type_');
		fieldNames.push(async () => {
			let noteIds = await this.tagNoteIds(item.id);
			console.info('NOTE IDS', noteIds);
			return {
				key: 'notes_',
				value: noteIds.join(','),
			};
		});
		lodash.pull(fieldNames, 'sync_time');
		return super.serialize(item, 'tag', fieldNames);
	}

	static async tagNoteIds(tagId) {
		let rows = await this.db().selectAll('SELECT note_id FROM note_tags WHERE tag_id = ?', [tagId]);
		let output = [];
		for (let i = 0; i < rows.length; i++) {
			output.push(rows[i].note_id);
		}
		return output;
	}

	// TODO: in order for a sync to happen, the updated_time property should somehow be changed
	// whenever an tag is applied or removed from an item. Either the updated_time property
	// is changed here or by the caller?

	static async addNote(tagId, noteId) {
		let hasIt = await this.hasNote(tagId, noteId);
		if (hasIt) return;

		let query = Database.insertQuery('note_tags', {
			tag_id: tagId,
			note_id: noteId,
		});

		await this.db().exec(query);
		//await this.save({ id: tagId, updated_time: time.unixMs() }); //type_: BaseModel.MODEL_TYPE_TAG
	}

	static async addNotes(tagId, noteIds) {
		for (let i = 0; i < noteIds.length; i++) {
			await this.addNote(tagId, noteIds[i]);
		}
	}

	// Note: updated_time must not change since this is only called from
	// the synchronizer, which manages and sets the correct updated_time
	static async setAssociatedNotes(tagId, noteIds) {
		let queries = [{
			sql: 'DELETE FROM note_tags WHERE tag_id = ?',
			params: [tagId],
		}];

		for (let i = 0; i < noteIds.length; i++) {
			queries.push(Database.insertQuery('note_tags', { tag_id: tagId, note_id: noteIds[i] }));
		}

		return this.db().transactionExecBatch(queries);
	}

	static async hasNote(tagId, noteId) {
		let r = await this.db().selectOne('SELECT note_id FROM note_tags WHERE tag_id = ? AND note_id = ? LIMIT 1', [tagId, noteId]);
		return !!r;
	}

	static removeNote(tagId, noteId) {
		return this.db().exec('DELETE FROM note_tags WHERE tag_id = ? AND note_id = ?', [tagId, noteId]);
	}

}

export { Tag };