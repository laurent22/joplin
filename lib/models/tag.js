import { BaseModel } from 'lib/base-model.js';
import { Database } from 'lib/database.js';
import { BaseItem } from 'lib/models/base-item.js';
import { time } from 'lib/time-utils.js';
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

	static async addNote(tagId, noteId) {
		let hasIt = await this.hasNote(tagId, noteId);
		if (hasIt) return;

		let query = Database.insertQuery('note_tags', {
			tag_id: tagId,
			note_id: noteId,
		});

		await this.db().exec(query);
		await this.save({ id: tagId, updated_time: time.unixMs() });
	}

	static async removeNote(tagId, noteId) {
		await this.db().exec('DELETE FROM note_tags WHERE tag_id = ? AND note_id = ?', [tagId, noteId]);
		await this.save({ id: tagId, updated_time: time.unixMs() });
	}

	// Note: updated_time must not change here since this is only called from
	// save(), which already handles how the updated_time property is set.
	static async setAssociatedNotes_(tagId, noteIds) {
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

	static async save(o, options = null) {
		let result = await super.save(o, options);

		if (options && options.applyMetadataChanges === true) {
			if (o.notes_) {
				let noteIds = o.notes_.split(',');
				await this.setAssociatedNotes_(o.id, noteIds);
			}
		}

		return result;
	}

}

export { Tag };