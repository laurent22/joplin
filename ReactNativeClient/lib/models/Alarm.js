const { BaseModel } = require('lib/base-model.js');
const { Note } = require('lib/models/note.js');

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

	static async deleteExpiredAlarms() {
		return this.db().exec('DELETE FROM alarms WHERE trigger_time <= ?', [Date.now()]);
	}

	static async alarmIdsWithoutNotes() {
		// https://stackoverflow.com/a/4967229/561309
		const alarms = await this.db().selectAll('SELECT alarms.id FROM alarms LEFT JOIN notes ON alarms.note_id = notes.id WHERE notes.id IS NULL');
		return alarms.map((a) => { return a.id });
	}

	static async makeNotification(alarm, note = null) {
		if (!note) note = await Note.load(alarm.note_id);

		const output = {
			id: alarm.id,
			date: new Date(note.todo_due),
			title: note.title.substr(0,128),
		};

		if (note.body) output.body = note.body.substr(0,512);

		return output;		
	}

}

module.exports = Alarm;