import AlarmService from './AlarmService';
import Note from '../models/Note';
import Alarm from '../models/Alarm';
import Logger from '@joplin/utils/Logger';
import { setupDatabaseAndSynchronizer, switchClient, msleep } from '../testing/test-utils';
import eventManager, { EventName } from '../eventManager';

describe('AlarmService', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		eventManager.reset();
		AlarmService.setLogger(Logger.create(''));
	});

	it('should reschedule a daily repeating to-do', (async () => {
		const driver = {
			scheduleNotification: jest.fn(),
			clearNotification: jest.fn(),
			hasPersistentNotifications: () => false,
			notificationIsSet: () => false,
		};
		AlarmService.setDriver(driver);

		const now = Date.now();
		const todoDue = now - 1000; // Overdue by 1 second

		let note = await Note.save({
			title: 'Repeating Todo',
			is_todo: 1,
			todo_due: todoDue,
			alarm_interval: 1, // Daily
		});

		// Trigger the alarm update
		await AlarmService.updateNoteNotification(note.id);

		// The note should have been updated with a new due date (1 day later)
		note = await Note.load(note.id);
		expect(note.todo_due).toBeGreaterThan(todoDue);
		expect(note.todo_due).toBe(todoDue + 86400000);

		// An alarm should have been scheduled for the new date
		const alarm = await Alarm.byNoteId(note.id);
		expect(alarm).toBeTruthy();
		expect(alarm.trigger_time).toBe(note.todo_due);
	}));

	it('should catch up on multiple missed intervals', (async () => {
		const driver = {
			scheduleNotification: jest.fn(),
			clearNotification: jest.fn(),
			hasPersistentNotifications: () => false,
			notificationIsSet: () => false,
		};
		AlarmService.setDriver(driver);

		const now = Date.now();
		const todoDue = now - (86400000 * 2) - 1000; // Overdue by 2 days and 1 second

		let note = await Note.save({
			title: 'Catch-up Todo',
			is_todo: 1,
			todo_due: todoDue,
			alarm_interval: 1, // Daily
		});

		await AlarmService.updateNoteNotification(note.id);

		note = await Note.load(note.id);
		// Should have moved forward by 3 days total to be in the future
		expect(note.todo_due).toBe(todoDue + (86400000 * 3));
		expect(note.todo_due).toBeGreaterThan(now);
	}));

	it('should trigger rescheduling on NoteAlarmTrigger event', (async () => {
		const driver = {
			scheduleNotification: jest.fn(),
			clearNotification: jest.fn(),
			hasPersistentNotifications: () => false,
			notificationIsSet: () => false,
		};
		AlarmService.setDriver(driver);

		const now = Date.now();
		const todoDue = now - 1000;

		const note = await Note.save({
			title: 'Event Todo',
			is_todo: 1,
			todo_due: todoDue,
			alarm_interval: 1,
		});

		// Create the initial alarm
		await Alarm.save({ note_id: note.id, trigger_time: todoDue });

		// Emit the trigger event (simulating the driver firing the alarm)
		eventManager.emit(EventName.NoteAlarmTrigger, { noteId: note.id });

		// Wait for the async operation in the listener
		await msleep(200);

		const updatedNote = await Note.load(note.id);
		expect(updatedNote.todo_due).toBe(todoDue + 86400000);
	}));
});
