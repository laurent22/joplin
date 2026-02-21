import { setupDatabaseAndSynchronizer, switchClient } from '../testing/test-utils';
import Alarm from './Alarm';
import Folder from './Folder';
import Note from './Note';
import { AlarmEntity } from '../services/database/types';

describe('models/Alarm', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	describe('shouldTriggerAlarm', () => {
		it('should trigger for a one-time alarm (no repeat_interval)', () => {
			const alarm: AlarmEntity = { trigger_time: Date.now() - 1000, repeat_interval: undefined, last_trigger_time: 0 };
			expect(Alarm.shouldTriggerAlarm(alarm)).toBe(true);
		});

		it('should trigger for a one-time alarm with repeat_interval = none', () => {
			const alarm: AlarmEntity = { trigger_time: Date.now() - 1000, repeat_interval: 'none', last_trigger_time: 0 };
			expect(Alarm.shouldTriggerAlarm(alarm)).toBe(true);
		});

		it('should trigger on first occurrence when no last_trigger_time', () => {
			const alarm: AlarmEntity = { trigger_time: Date.now() - 1000, repeat_interval: 'daily', last_trigger_time: 0 };
			expect(Alarm.shouldTriggerAlarm(alarm)).toBe(true);
		});

		it('should trigger when next occurrence is due', () => {
			// last_trigger_time was 2 days ago, daily = should trigger
			const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
			const alarm: AlarmEntity = { trigger_time: twoDaysAgo, repeat_interval: 'daily', last_trigger_time: twoDaysAgo };
			expect(Alarm.shouldTriggerAlarm(alarm)).toBe(true);
		});

		it('should not trigger when next occurrence is in the future', () => {
			// last_trigger_time was 1 hour ago, daily = not yet due
			const oneHourAgo = Date.now() - 60 * 60 * 1000;
			const alarm: AlarmEntity = { trigger_time: oneHourAgo, repeat_interval: 'daily', last_trigger_time: oneHourAgo };
			expect(Alarm.shouldTriggerAlarm(alarm)).toBe(false);
		});
	});

	describe('calculateNextTriggerTime', () => {
		const baseDateMs = new Date('2025-01-01T10:00:00Z').getTime();

		it('should return same time when repeat_interval is none', () => {
			expect(Alarm.calculateNextTriggerTime(baseDateMs, 'none')).toBe(baseDateMs);
		});

		it('should calculate next daily occurrence', () => {
			const next = Alarm.calculateNextTriggerTime(baseDateMs, 'daily');
			const expectedMs = baseDateMs + 24 * 60 * 60 * 1000;
			expect(next).toBe(expectedMs);
		});

		it('should calculate next weekly occurrence', () => {
			const next = Alarm.calculateNextTriggerTime(baseDateMs, 'weekly');
			const expectedMs = baseDateMs + 7 * 24 * 60 * 60 * 1000;
			expect(next).toBe(expectedMs);
		});

		it('should calculate next monthly occurrence', () => {
			const next = Alarm.calculateNextTriggerTime(baseDateMs, 'monthly');
			// Feb 1 2025 10:00:00 UTC
			const expectedMs = new Date('2025-02-01T10:00:00Z').getTime();
			expect(next).toBe(expectedMs);
		});

		it('should respect maxDate and return current time when next occurrence exceeds it', () => {
			// maxDate is in 12 hours — well before next daily occurrence
			const maxDate = baseDateMs + 12 * 60 * 60 * 1000;
			const next = Alarm.calculateNextTriggerTime(baseDateMs, 'daily', maxDate);
			expect(next).toBe(baseDateMs);
		});

		it('should return next occurrence when it is within maxDate', () => {
			// maxDate is in 48 hours — daily next occurrence (24h) fits
			const maxDate = baseDateMs + 48 * 60 * 60 * 1000;
			const next = Alarm.calculateNextTriggerTime(baseDateMs, 'daily', maxDate);
			expect(next).toBe(baseDateMs + 24 * 60 * 60 * 1000);
		});

		it('should handle RRULE strings directly', () => {
			const rrule = 'DTSTART:20250101T100000Z\nRRULE:FREQ=DAILY;INTERVAL=1';
			const next = Alarm.calculateNextTriggerTime(baseDateMs, rrule);
			expect(next).toBe(baseDateMs + 24 * 60 * 60 * 1000);
		});
	});

	describe('deleteExpiredNonRepeatingAlarms', () => {
		it('should delete expired one-time alarms', async () => {
			const folder = await Folder.save({ title: 'folder' });
			const note = await Note.save({ title: 'test todo', is_todo: 1, parent_id: folder.id });

			// Create an expired non-repeating alarm
			await Alarm.save({ note_id: note.id, trigger_time: Date.now() - 10000, repeat_interval: 'none' });

			await Alarm.deleteExpiredNonRepeatingAlarms();

			const alarm = await Alarm.byNoteId(note.id);
			expect(alarm).toBeFalsy();
		});

		it('should not delete expired repeating alarms', async () => {
			const folder = await Folder.save({ title: 'folder' });
			const note = await Note.save({ title: 'test todo', is_todo: 1, parent_id: folder.id });

			// Create an expired repeating alarm
			await Alarm.save({ note_id: note.id, trigger_time: Date.now() - 10000, repeat_interval: 'daily' });

			await Alarm.deleteExpiredNonRepeatingAlarms();

			const alarm = await Alarm.byNoteId(note.id);
			expect(alarm).not.toBeNull();
		});

		it('should not delete non-expired alarms', async () => {
			const folder = await Folder.save({ title: 'folder' });
			const note = await Note.save({ title: 'test todo', is_todo: 1, parent_id: folder.id });

			// Create a future non-repeating alarm
			await Alarm.save({ note_id: note.id, trigger_time: Date.now() + 86400000, repeat_interval: 'none' });

			await Alarm.deleteExpiredNonRepeatingAlarms();

			const alarm = await Alarm.byNoteId(note.id);
			expect(alarm).not.toBeNull();
		});
	});

	describe('updateLastTriggered', () => {
		it('should update last_trigger_time to current time', async () => {
			const folder = await Folder.save({ title: 'folder' });
			const note = await Note.save({ title: 'test todo', is_todo: 1, parent_id: folder.id });
			await Alarm.save({ note_id: note.id, trigger_time: Date.now() + 86400000, repeat_interval: 'daily' });

			const savedAlarm = await Alarm.byNoteId(note.id);
			const before = Date.now();
			await Alarm.updateLastTriggered(savedAlarm.id);
			const after = Date.now();

			const alarm = await Alarm.byNoteId(note.id);
			expect(alarm).not.toBeFalsy();
			expect(alarm.last_trigger_time).toBeGreaterThanOrEqual(before);
			expect(alarm.last_trigger_time).toBeLessThanOrEqual(after);
		});
	});
});
