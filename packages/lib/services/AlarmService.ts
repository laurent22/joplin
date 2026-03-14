import Logger from '@joplin/utils/Logger';
import Alarm from '../models/Alarm';
import Note from '../models/Note';
import eventManager, { EventName } from '../eventManager';

export default class AlarmService {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private static driver_: any;
	private static logger_: Logger;
	// private static inAppNotificationHandler_:any;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static setDriver(v: any) {
		this.driver_ = v;

		if (this.driver_.setService) this.driver_.setService(this);

		eventManager.on(EventName.NoteAlarmTrigger, (event) => {
			void this.updateNoteNotification(event.noteId);
		});
	}

	public static driver() {
		if (!this.driver_) throw new Error('AlarmService driver not set!');
		return this.driver_;
	}

	public static setLogger(v: Logger) {
		this.logger_ = v;
	}

	public static logger() {
		return this.logger_;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static setInAppNotificationHandler(v: any) {
		// this.inAppNotificationHandler_ = v;
		if (this.driver_.setInAppNotificationHandler) this.driver_.setInAppNotificationHandler(v);
	}

	public static async garbageCollect() {
		this.logger().info('Garbage collecting alarms...');

		// Delete alarms that have already been triggered
		await Alarm.deleteExpiredAlarms();

		// Delete alarms that correspond to non-existent notes
		const alarmIds = await Alarm.alarmIdsWithoutNotes();
		for (let i = 0; i < alarmIds.length; i++) {
			this.logger().info(`Clearing notification for non-existing note. Alarm ${alarmIds[i]}`);
			await this.driver().clearNotification(alarmIds[i]);
		}
		await Alarm.batchDelete(alarmIds, { sourceDescription: 'AlarmService/garbageCollect' });
	}

	// When passing a note, make sure it has all the required properties
	// (better to pass a complete note or else just the ID)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static async updateNoteNotification(noteOrId: any, isDeleted = false, forceReschedule = false) {
		try {
			let note = null;
			let noteId = null;

			if (typeof noteOrId === 'object') {
				note = noteOrId;
				noteId = note.id;
			} else {
				note = await Note.load(noteOrId);
				noteId = note ? note.id : null;
			}

			if (!note && !isDeleted) return;

			const driver = this.driver();

			let alarm = noteId ? await Alarm.byNoteId(noteId) : null;
			let clearAlarm = false;

			const rescheduleRequested = forceReschedule && note && note.alarm_interval > 0;
			const isOverdueRepeating = note && note.is_todo && note.alarm_interval > 0 && note.todo_due <= Date.now() && note.todo_due > 0;
			const needsReschedule = isOverdueRepeating || rescheduleRequested;

			if (isDeleted || !Note.needAlarm(note) || (alarm && alarm.trigger_time !== note.todo_due) || needsReschedule) {
				clearAlarm = !!alarm;
			}

			if (clearAlarm || (!alarm && needsReschedule)) {
				if (clearAlarm) {
					this.logger().info(`Clearing notification for note ${noteId}`);
					await driver.clearNotification(alarm.id);
					await Alarm.delete(alarm.id, { sourceDescription: 'AlarmService/clearAlarm' });
				}

				if (needsReschedule && !isDeleted) {
					const interval = Number(note.alarm_interval || 0);
					const now = Date.now();
					let nextDue = Number(note.todo_due || 0);

					const intervalToMs = (intervalId: number) => {
						if (intervalId === 1) return 86400000; // Daily
						if (intervalId === 2) return 604800000; // Weekly
						if (intervalId === 3) return 2592000000; // ~Monthly (30 days)
						if (intervalId === 4) return 31536000000; // Yearly
						return 0;
					};

					const intervalMs = intervalToMs(interval);
					if (intervalMs) {
						// On explicit reschedule (user changed repeat), always jump forward one interval from now or the existing due, whichever is later.
						if (rescheduleRequested) {
							const base = nextDue && nextDue > now ? nextDue : now;
							nextDue = base + intervalMs;
						} else {
							if (!nextDue) nextDue = now + intervalMs;

							while (nextDue <= now) {
								nextDue += intervalMs;
							}
						}

						if (nextDue > note.todo_due) {
							this.logger().info(`Rescheduling note ${note.id}: ${note.todo_due} -> ${nextDue}`);
							await Note.save({ id: note.id, todo_due: nextDue }, { autoTimestamp: false });
							note.todo_due = nextDue;
							// Don't return, let it continue to save the alarm for the new date
						}
					}
				}
			}

			if (!clearAlarm && alarm) {
				// Alarm already exists and set at the right time
				if (!driver.hasPersistentNotifications() && !driver.notificationIsSet(alarm.id)) {
					const notification = await Alarm.makeNotification(alarm, note);
					this.logger().info(`Scheduling (non-persistent) notification for note ${note.id}`, notification);
					driver.scheduleNotification(notification);
				}

				return;
			}

			if (isDeleted || !Note.needAlarm(note)) return;

			await Alarm.save({
				note_id: note.id,
				trigger_time: note.todo_due,
			});

			// Reload alarm to get its ID
			alarm = await Alarm.byNoteId(note.id);
			if (!alarm) return;

			const notification = await Alarm.makeNotification(alarm, note);
			this.logger().info(`Scheduling notification for note ${note.id}`, notification);
			await driver.scheduleNotification(notification);
		} catch (error) {
			this.logger().error('Could not update notification', error);
		}
	}

	public static async updateAllNotifications() {
		this.logger().info('Updating all notifications...');

		await this.garbageCollect();

		const dueNotes = await Note.dueNotes();
		for (let i = 0; i < dueNotes.length; i++) {
			await this.updateNoteNotification(dueNotes[i]);
		}
	}
}
