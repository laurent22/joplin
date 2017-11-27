const { Note } = require('lib/models/note.js');
const Alarm = require('lib/models/Alarm.js');

class AlarmService {

	static setDriver(v) {
		this.driver_ = v;
	}

	static driver() {
		if (!this.driver_) throw new Error('AlarmService driver not set!');
		return this.driver_;
	}

	static setLogger(v) {
		this.logger_ = v;
	}

	static logger() {
		return this.logger_;
	}

	static async updateNoteNotification(noteId, isDeleted = false) {
		const note = await Note.load(noteId);
		if (!note && !isDeleted) return;

		let alarm = await Alarm.byNoteId(note.id);
		let clearAlarm = false;

		if (isDeleted ||
		    !Note.needAlarm(note) ||
		    (alarm && alarm.trigger_time !== note.todo_due))
		{
			clearAlarm = !!alarm;
		}

		if (!clearAlarm && alarm) return; // Alarm already exists and set at the right time

		if (clearAlarm) {
			this.logger().info('Clearing notification for note ' + noteId);
			await this.driver().clearNotification(alarm.id);
			await Alarm.delete(alarm.id);
		}

		if (isDeleted || !Note.needAlarm(note)) return;

		await Alarm.save({
			note_id: note.id,
			trigger_time: note.todo_due,
		});

		// Reload alarm to get its ID
		alarm = await Alarm.byNoteId(note.id);

		const notification = {
			id: alarm.id,
			date: new Date(note.todo_due),
			title: note.title,
		};

		if (note.body) notification.body = note.body;

		this.logger().info('Scheduling notification for note ' + note.id, notification);
		await this.driver().scheduleNotification(notification);
	}

	// TODO: inner notifications (when app is active)
	// TODO: locale-dependent format

}

module.exports = AlarmService;