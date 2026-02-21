import Logger from '@joplin/utils/Logger';
import Alarm from '../models/Alarm';

import Note from '../models/Note';

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

	public static async garbageCollect() {
		this.logger().info('Garbage collecting alarms...');

		// Delete only non-repeating alarms that have been triggered
		await Alarm.deleteExpiredNonRepeatingAlarms();

		// Delete alarms that correspond to non-existent notes
		const alarmIds = await Alarm.alarmIdsWithoutNotes();
		for (let i = 0; i < alarmIds.length; i++) {
			this.logger().info(`Clearing notification for non-existing note. Alarm ${alarmIds[i]}`);
			await this.driver().clearNotification(alarmIds[i]);
		}
		// alarmIdsWithoutNotes returns numeric IDs; batchDelete expects strings
		await Alarm.batchDelete(alarmIds.map((id: number) => String(id)), { sourceDescription: 'AlarmService/garbageCollect' });
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

			const isRepeatingAlarm = alarm && alarm.repeat_interval && alarm.repeat_interval !== 'none';

			// For repeating alarms, don't clear just because trigger_time differs from todo_due
			// since the trigger_time is updated to the next occurrence after each fire.
			// For one-time alarms, clear if trigger_time doesn't match todo_due (user changed the due date).
			if (isDeleted || !Note.needAlarm(note) || (!isRepeatingAlarm && alarm && alarm.trigger_time !== note.todo_due)) {
				clearAlarm = !!alarm;
			}

			if (!clearAlarm && alarm) {
				// Alarm already exists at the right time
				const newInterval = note.alarm_interval || 'none';

				// If the repeat interval changed, update the alarm and reschedule
				if (alarm.repeat_interval !== newInterval) {
					this.logger().info(`Updating repeat_interval for alarm ${alarm.id} from "${alarm.repeat_interval}" to "${newInterval}"`);
					await Alarm.save({ id: String(alarm.id), repeat_interval: newInterval });
					alarm = await Alarm.byNoteId(note.id);
					await driver.clearNotification(alarm.id);
					const notification = await Alarm.makeNotification(alarm, note);
					await driver.scheduleNotification(notification);
					return;
				}

				// For repeating alarms, if todo_due moved to before the next trigger, reschedule from todo_due
				if (isRepeatingAlarm && note.todo_due && note.todo_due < alarm.trigger_time) {
					this.logger().info(`todo_due moved before trigger_time for repeating alarm ${alarm.id}, rescheduling from todo_due`);
					await driver.clearNotification(alarm.id);
					await Alarm.delete(alarm.id, { sourceDescription: 'AlarmService/updateNoteNotification' });
					await Alarm.save({
						note_id: note.id,
						trigger_time: note.todo_due,
						repeat_interval: newInterval,
					});
					alarm = await Alarm.byNoteId(note.id);
					const notification = await Alarm.makeNotification(alarm, note);
					await driver.scheduleNotification(notification);
					return;
				}

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
				repeat_interval: note.alarm_interval || 'none',
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

	// Handle notification trigger - update last triggered time and reschedule if repeating
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static async handleNotificationTrigger(alarmId: number) {
		try {
			const alarm = await Alarm.load(String(alarmId));
			if (!alarm) {
				this.logger().warn(`Alarm ${alarmId} not found when handling trigger`);
				return;
			}

			// If it's a repeating alarm, update last trigger time and reschedule
			if (alarm.repeat_interval && alarm.repeat_interval !== 'none') {
				this.logger().info(`Repeating alarm ${alarmId} triggered, rescheduling...`);

				const note = await Note.load(alarm.note_id);
				if (!note) {
					this.logger().warn(`Note ${alarm.note_id} not found for alarm ${alarmId}, deleting alarm`);
					await Alarm.delete(String(alarmId), { sourceDescription: 'AlarmService/handleNotificationTrigger' });
					return;
				}

				// Update last trigger time
				await Alarm.updateLastTriggered(alarmId);

				// Calculate next trigger time, capped at the todo due date
				const nextTrigger = Alarm.calculateNextTriggerTime(alarm.trigger_time, alarm.repeat_interval, note.todo_due);

				// If next trigger is same as current (no future occurrence before due date), stop rescheduling
				if (nextTrigger === alarm.trigger_time) {
					this.logger().info(`No more occurrences for alarm ${alarmId} before due date, removing repeat interval`);
					await Alarm.save({ id: String(alarmId), repeat_interval: 'none' });
					return;
				}

				// Update alarm with new trigger time
				await Alarm.save({
					id: String(alarmId),
					trigger_time: nextTrigger,
				});

				// Schedule the next notification directly
				const updatedAlarm = await Alarm.load(String(alarmId));
				if (updatedAlarm) {
					const notification = await Alarm.makeNotification(updatedAlarm, note);
					this.logger().info(`Rescheduling repeating alarm ${alarmId} for note ${note.id}`, notification);
					await this.driver().scheduleNotification(notification);
				}
			} else {
				// Non-repeating alarm - delete it after triggering
				this.logger().info(`Non-repeating alarm ${alarmId} triggered, deleting...`);
				await this.driver().clearNotification(alarmId);
				await Alarm.delete(String(alarmId), { sourceDescription: 'AlarmService/handleNotificationTrigger' });
			}
		} catch (error) {
			this.logger().error(`Error handling notification trigger for alarm ${alarmId}`, error);
		}
	}
}
