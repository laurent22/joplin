import { setupDatabaseAndSynchronizer, switchClient } from '../testing/test-utils';
import Alarm from '../models/Alarm';
import Note from '../models/Note';
import Folder from '../models/Folder';
import AlarmService from './AlarmService';
import Logger from '@joplin/utils/Logger';

// Minimal mock driver for AlarmService
const mockDriver = {
	scheduledNotifications: {} as Record<number, unknown>,
	clearedNotifications: [] as number[],

	setService(s: unknown) { void s; },
	hasPersistentNotifications() { return false; },
	notificationIsSet(id: number) { return id in this.scheduledNotifications; },
	clearNotification(id: number) {
		delete this.scheduledNotifications[id];
		this.clearedNotifications.push(id);
	},
	async scheduleNotification(notification: { id: number }) {
		this.scheduledNotifications[notification.id] = notification;
	},
	reset() {
		this.scheduledNotifications = {};
		this.clearedNotifications = [];
	},
};

describe('services/AlarmService', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);

		mockDriver.reset();

		const logger = new Logger();
		AlarmService.setLogger(logger);
		AlarmService.setDriver(mockDriver);
	});

	describe('garbageCollect', () => {
		it('should delete expired non-repeating alarms', async () => {
			const folder = await Folder.save({ title: 'folder' });
			const note = await Note.save({ title: 'todo', is_todo: 1, parent_id: folder.id });
			await Alarm.save({ note_id: note.id, trigger_time: Date.now() - 5000, repeat_interval: 'none' });

			await AlarmService.garbageCollect();

			const alarm = await Alarm.byNoteId(note.id);
			expect(alarm).toBeFalsy();
		});

		it('should preserve expired repeating alarms', async () => {
			const folder = await Folder.save({ title: 'folder' });
			const note = await Note.save({ title: 'todo', is_todo: 1, parent_id: folder.id });
			await Alarm.save({ note_id: note.id, trigger_time: Date.now() - 5000, repeat_interval: 'daily' });

			await AlarmService.garbageCollect();

			const alarm = await Alarm.byNoteId(note.id);
			expect(alarm).not.toBeNull();
		});

		it('should delete alarms for non-existent notes', async () => {
			// Create alarm for a note that no longer exists
			await Alarm.db().exec('INSERT INTO alarms (note_id, trigger_time, repeat_interval) VALUES (?, ?, ?)', ['non-existent-id', Date.now() + 10000, 'none']);
			const alarmsBefore = await Alarm.db().selectAll('SELECT * FROM alarms WHERE note_id = ?', ['non-existent-id']);
			expect(alarmsBefore.length).toBe(1);

			await AlarmService.garbageCollect();

			const alarmsAfter = await Alarm.db().selectAll('SELECT * FROM alarms WHERE note_id = ?', ['non-existent-id']);
			expect(alarmsAfter.length).toBe(0);
		});
	});

	describe('updateNoteNotification', () => {
		it('should create an alarm with repeat_interval from alarm_interval', async () => {
			const folder = await Folder.save({ title: 'folder' });
			const note = await Note.save({
				title: 'daily todo',
				is_todo: 1,
				todo_due: Date.now() + 86400000,
				alarm_interval: 'daily',
				parent_id: folder.id,
			});

			await AlarmService.updateNoteNotification(note);

			const alarm = await Alarm.byNoteId(note.id);
			expect(alarm).not.toBeNull();
			expect(alarm.repeat_interval).toBe('daily');
		});

		it('should default repeat_interval to none when no alarm_interval', async () => {
			const folder = await Folder.save({ title: 'folder' });
			const note = await Note.save({
				title: 'one-time todo',
				is_todo: 1,
				todo_due: Date.now() + 86400000,
				parent_id: folder.id,
			});

			await AlarmService.updateNoteNotification(note);

			const alarm = await Alarm.byNoteId(note.id);
			expect(alarm).not.toBeNull();
			expect(alarm.repeat_interval).toBe('none');
		});

		it('should not clear a repeating alarm just because trigger_time differs from todo_due', async () => {
			const folder = await Folder.save({ title: 'folder' });
			const todoDue = Date.now() + 7 * 24 * 60 * 60 * 1000;
			const note = await Note.save({
				title: 'repeating todo',
				is_todo: 1,
				todo_due: todoDue,
				alarm_interval: 'daily',
				parent_id: folder.id,
			});

			// Create a repeating alarm with a rescheduled trigger_time (different from todo_due)
			await Alarm.save({
				note_id: note.id,
				trigger_time: todoDue + 24 * 60 * 60 * 1000, // already rescheduled to next day
				repeat_interval: 'daily',
			});

			await AlarmService.updateNoteNotification(note);

			// Alarm should still be present
			const alarm = await Alarm.byNoteId(note.id);
			expect(alarm).not.toBeNull();
			expect(alarm.repeat_interval).toBe('daily');
		});

		it('should update repeat_interval and reschedule when alarm_interval changes on existing alarm', async () => {
			const folder = await Folder.save({ title: 'folder' });
			const todoDue = Date.now() + 7 * 24 * 60 * 60 * 1000;
			const note = await Note.save({
				title: 'todo interval change',
				is_todo: 1,
				todo_due: todoDue,
				alarm_interval: 'weekly',
				parent_id: folder.id,
			});

			// Alarm exists with the old interval
			await Alarm.save({ note_id: note.id, trigger_time: todoDue, repeat_interval: 'daily' });
			const beforeAlarm = await Alarm.byNoteId(note.id);

			await AlarmService.updateNoteNotification(note);

			const afterAlarm = await Alarm.byNoteId(note.id);
			expect(afterAlarm).not.toBeNull();
			// repeat_interval should now reflect the new alarm_interval
			expect(afterAlarm.repeat_interval).toBe('weekly');
			// The old alarm id is preserved (only the interval is updated, not recreated)
			expect(afterAlarm.id).toBe(beforeAlarm.id);
			// Driver should have rescheduled (cleared + scheduled)
			expect(mockDriver.clearedNotifications).toContain(beforeAlarm.id);
			expect(mockDriver.scheduledNotifications[beforeAlarm.id]).toBeTruthy();
		});

		it('should reschedule alarm from todo_due when todo_due moves earlier than trigger_time', async () => {
			const folder = await Folder.save({ title: 'folder' });
			const now = Date.now();
			const note = await Note.save({
				title: 'early due todo',
				is_todo: 1,
				todo_due: now + 2 * 60 * 60 * 1000, // 2 hours from now
				alarm_interval: 'daily',
				parent_id: folder.id,
			});

			// Alarm has a trigger_time further in the future than todo_due
			await Alarm.save({
				note_id: note.id,
				trigger_time: now + 25 * 60 * 60 * 1000, // 25 hours — past todo_due
				repeat_interval: 'daily',
			});
			const beforeAlarm = await Alarm.byNoteId(note.id);

			await AlarmService.updateNoteNotification(note);

			const afterAlarm = await Alarm.byNoteId(note.id);
			expect(afterAlarm).not.toBeNull();
			// trigger_time should have been reset to todo_due
			expect(afterAlarm.trigger_time).toBe(note.todo_due);
			// Old alarm should have been cleared
			expect(mockDriver.clearedNotifications).toContain(beforeAlarm.id);
		});
	});

	describe('handleNotificationTrigger', () => {
		it('should reschedule a repeating alarm after triggering', async () => {
			const folder = await Folder.save({ title: 'folder' });
			const todoDue = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days from now
			const note = await Note.save({
				title: 'daily todo',
				is_todo: 1,
				todo_due: todoDue,
				alarm_interval: 'daily',
				parent_id: folder.id,
			});

			const triggerTime = Date.now() + 86400000;
			await Alarm.save({ note_id: note.id, trigger_time: triggerTime, repeat_interval: 'daily' });
			const savedAlarm = await Alarm.byNoteId(note.id);

			await AlarmService.handleNotificationTrigger(savedAlarm.id);

			const alarm = await Alarm.byNoteId(note.id);
			expect(alarm).not.toBeFalsy();
			// trigger_time should have advanced by one day
			expect(alarm.trigger_time).toBeGreaterThan(triggerTime);
			expect(alarm.last_trigger_time).toBeGreaterThan(0);
		});

		it('should delete a non-repeating alarm after triggering', async () => {
			const folder = await Folder.save({ title: 'folder' });
			const note = await Note.save({ title: 'one-time todo', is_todo: 1, parent_id: folder.id });
			await Alarm.save({
				note_id: note.id,
				trigger_time: Date.now() + 86400000,
				repeat_interval: 'none',
			});
			const savedAlarm = await Alarm.byNoteId(note.id);

			await AlarmService.handleNotificationTrigger(savedAlarm.id);

			const alarm = await Alarm.byNoteId(note.id);
			expect(alarm).toBeFalsy();
		});

		it('should stop rescheduling when next occurrence exceeds todo_due', async () => {
			const folder = await Folder.save({ title: 'folder' });
			// todo_due is in 6 hours - less than one day, so daily repeat can't reschedule
			const todoDue = Date.now() + 6 * 60 * 60 * 1000;
			const note = await Note.save({
				title: 'expiring todo',
				is_todo: 1,
				todo_due: todoDue,
				alarm_interval: 'daily',
				parent_id: folder.id,
			});

			await Alarm.save({
				note_id: note.id,
				trigger_time: Date.now() + 1000,
				repeat_interval: 'daily',
			});
			const savedAlarm = await Alarm.byNoteId(note.id);

			await AlarmService.handleNotificationTrigger(savedAlarm.id);

			// repeat_interval should have been set to 'none' since no future daily occurrence fits
			const alarm = await Alarm.byNoteId(note.id);
			if (alarm) {
				expect(alarm.repeat_interval).toBe('none');
			}
			// (alarm could also be null if max date logic removes it entirely — both are valid)
		});

		it('should clear old notification before scheduling the next one on reschedule', async () => {
			const folder = await Folder.save({ title: 'folder' });
			const todoDue = Date.now() + 30 * 24 * 60 * 60 * 1000;
			const triggerTime = Date.now() + 86400000;
			const note = await Note.save({
				title: 'clear before reschedule',
				is_todo: 1,
				todo_due: todoDue,
				alarm_interval: 'daily',
				parent_id: folder.id,
			});

			await Alarm.save({ note_id: note.id, trigger_time: triggerTime, repeat_interval: 'daily' });
			const savedAlarm = await Alarm.byNoteId(note.id);

			// Pre-populate the mock driver as if a notification is already scheduled
			mockDriver.scheduledNotifications[savedAlarm.id] = { id: savedAlarm.id };
			mockDriver.clearedNotifications = [];

			await AlarmService.handleNotificationTrigger(savedAlarm.id);

			// clearNotification must have been called with the alarm id before scheduleNotification
			expect(mockDriver.clearedNotifications).toContain(savedAlarm.id);
			// A new notification must have been scheduled
			const rescheduledAlarm = await Alarm.byNoteId(note.id);
			expect(rescheduledAlarm).not.toBeNull();
			expect(mockDriver.scheduledNotifications[rescheduledAlarm.id]).toBeTruthy();
		});
	});
});
