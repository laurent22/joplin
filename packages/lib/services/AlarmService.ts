import Logger from '@joplin/utils/Logger';
import Alarm from '../models/Alarm';

import Note from '../models/Note';
import { nextOccurrence, RecurrenceInterval } from '../utils/recurrence';

export default class AlarmService {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private static driver_: any;
	private static logger_: Logger;
	// private static inAppNotificationHandler_:any;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static setDriver(v: any) {
		this.driver_ = v;

		if (this.driver_.setService) this.driver_.setService(this);
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

	/**
	 * Reschedules expired alarms for notes that have a recurrence interval set.
	 * Computes the next due date and updates the note, which in turn triggers
	 * a new alarm to be created.
	 */
	public static async rescheduleRecurringAlarms() {
		const expiredRecurring = await Alarm.expiredAlarmsWithRecurrence();

		for (const alarm of expiredRecurring) {
			const recurrence = alarm.todo_due_recurrence as RecurrenceInterval;
			const currentDue = alarm.todo_due as number;

			if (!recurrence || !currentDue) continue;

			let newDue = nextOccurrence(currentDue, recurrence);

			// If the computed next occurrence is still in the past (e.g., the app
			// was closed for a long time), keep advancing until we reach a future date.
			const now = Date.now();
			while (newDue && newDue <= now) {
				newDue = nextOccurrence(newDue, recurrence);
			}

			if (!newDue) continue;

			this.logger().info(`Rescheduling recurring alarm for note ${alarm.note_id}: ${currentDue} -> ${newDue} (${recurrence})`);

			// Clear the old alarm
			await this.driver().clearNotification(alarm.id);
			await Alarm.delete(alarm.id, { sourceDescription: 'AlarmService/rescheduleRecurring' });

			// Update the note's due date, which will trigger a new alarm via EVENT_NOTE_ALARM_FIELD_CHANGE
			await Note.save({
				id: alarm.note_id,
				todo_due: newDue,
			}, { autoTimestamp: false });
		}
	}

	public static async garbageCollect() {
		this.logger().info('Garbage collecting alarms...');

		// Reschedule recurring alarms before deleting expired ones
		await this.rescheduleRecurringAlarms();

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
	public static async updateNoteNotification(noteOrId: any, isDeleted = false) {
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

			if (isDeleted || !Note.needAlarm(note) || (alarm && alarm.trigger_time !== note.todo_due)) {
				clearAlarm = !!alarm;
			}

			if (!clearAlarm && alarm) {
				// Alarm already exists and set at the right time

				// For persistent notifications (those that stay active after the app has been closed, like on mobile), if we have
				// an alarm object we can be sure that the notification has already been set, so there's nothing to do.
				// For non-persistent notifications however we need to check that the notification has been set because, for example,
				// if the app has just started the notifications need to be set again. so we do this below.
				if (!driver.hasPersistentNotifications() && !driver.notificationIsSet(alarm.id)) {
					const notification = await Alarm.makeNotification(alarm, note);
					this.logger().info(`Scheduling (non-persistent) notification for note ${note.id}`, notification);
					driver.scheduleNotification(notification);
				}

				return;
			}

			if (clearAlarm) {
				this.logger().info(`Clearing notification for note ${noteId}`);
				await driver.clearNotification(alarm.id);
				await Alarm.delete(alarm.id, { sourceDescription: 'AlarmService/clearAlarm' });
			}

			if (isDeleted || !Note.needAlarm(note)) return;

			await Alarm.save({
				note_id: note.id,
				trigger_time: note.todo_due,
			});

			// Reload alarm to get its ID
			alarm = await Alarm.byNoteId(note.id);

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
