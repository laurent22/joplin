import BaseModel from '../BaseModel';
import Note from './Note';

export interface Notification {
	id: number;
	noteId: string;
	date: Date;
	title: string;
	body?: string;
}

export default class Alarm extends BaseModel {
	public static tableName() {
		return 'alarms';
	}

	public static modelType() {
		return BaseModel.TYPE_ALARM;
	}

	public static byNoteId(noteId: string) {
		return this.modelSelectOne('SELECT * FROM alarms WHERE note_id = ?', [noteId]);
	}

	public static async deleteExpiredAlarms() {
		return this.db().exec('DELETE FROM alarms WHERE trigger_time <= ?', [Date.now()]);
	}

	public static async alarmIdsWithoutNotes() {
		// https://stackoverflow.com/a/4967229/561309
		const alarms = await this.db().selectAll('SELECT alarms.id FROM alarms LEFT JOIN notes ON alarms.note_id = notes.id WHERE notes.id IS NULL');
		return alarms.map((a: any) => {
			return a.id;
		});
	}

	public static async makeNotification(alarm: any, note: any = null): Promise<Notification> {
		if (!note) {
			note = await Note.load(alarm.note_id);
		} else if (!note.todo_due) {
			this.logger().warn('Trying to create notification for note with todo_due property - reloading note object in case we are dealing with a partial note');
			note = await Note.load(alarm.note_id);
			this.logger().warn('Reloaded note:', note);
		}

		const output: Notification = {
			id: alarm.id,
			noteId: alarm.note_id,
			date: new Date(note.todo_due),
			title: note.title.substr(0, 128),
		};

		if (note.body) output.body = note.body.substr(0, 512);

		return output;
	}

	public static async allDue() {
		return this.modelSelectAll('SELECT * FROM alarms WHERE trigger_time >= ?', [Date.now()]);
	}
}
