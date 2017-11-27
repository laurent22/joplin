const { BaseModel } = require('lib/base-model.js');

class Alarm extends BaseModel {

	static tableName() {
		return 'alarms';
	}

	static modelType() {
		return BaseModel.TYPE_ALARM;
	}

	static byNoteId(noteId) {
		return this.modelSelectOne('SELECT * FROM alarms WHERE note_id = ?', [noteId]);
	}

	static async garbageCollect() {
		// Delete alarms that have already been triggered
		await this.db().exec('DELETE FROM alarms WHERE trigger_time <= ?', [Date.now()]);

		// Delete alarms that correspond to non-existent notes
		// https://stackoverflow.com/a/4967229/561309
		await this.db().exec('DELETE FROM alarms WHERE id IN (SELECT alarms.id FROM alarms LEFT JOIN notes ON alarms.note_id = notes.id WHERE notes.id IS NULL)');

		// TODO: Check for duplicate alarms for a note
		// const rows = await this.db().exec('SELECT count(*) as note_count, note_id from alarms group by note_id having note_count >= 2');
	}

}

module.exports = Alarm;