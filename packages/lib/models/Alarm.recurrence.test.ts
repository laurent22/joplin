import { setupDatabaseAndSynchronizer, switchClient } from '../testing/test-utils';
import Folder from './Folder';
import Note from './Note';
import Alarm from './Alarm';
import { RecurrenceInterval } from '../utils/recurrence';

describe('models/Alarm (recurrence)', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should not delete expired alarms for notes with recurrence', async () => {
		const folder = await Folder.save({ title: 'folder' });
		const pastTime = Date.now() - 60000; // 1 minute ago

		// Note WITH recurrence
		const noteRecurring = await Note.save({
			title: 'recurring alarm',
			parent_id: folder.id,
			is_todo: 1,
			todo_due: pastTime,
			todo_due_recurrence: RecurrenceInterval.Daily,
		});

		// Note WITHOUT recurrence
		const noteOneShot = await Note.save({
			title: 'one-shot alarm',
			parent_id: folder.id,
			is_todo: 1,
			todo_due: pastTime,
			todo_due_recurrence: '',
		});

		// Create alarms for both
		await Alarm.save({ note_id: noteRecurring.id, trigger_time: pastTime });
		await Alarm.save({ note_id: noteOneShot.id, trigger_time: pastTime });

		// Verify both alarms exist
		expect(await Alarm.byNoteId(noteRecurring.id)).toBeTruthy();
		expect(await Alarm.byNoteId(noteOneShot.id)).toBeTruthy();

		// Delete expired alarms
		await Alarm.deleteExpiredAlarms();

		// Recurring alarm should still exist, one-shot should be deleted
		expect(await Alarm.byNoteId(noteRecurring.id)).toBeTruthy();
		expect(await Alarm.byNoteId(noteOneShot.id)).toBeFalsy();
	});

	it('should return expired alarms with recurrence via expiredAlarmsWithRecurrence', async () => {
		const folder = await Folder.save({ title: 'folder' });
		const pastTime = Date.now() - 60000;

		// Note with recurrence (should be returned)
		const noteRecurring = await Note.save({
			title: 'recurring',
			parent_id: folder.id,
			is_todo: 1,
			todo_due: pastTime,
			todo_due_recurrence: RecurrenceInterval.Weekly,
		});

		// Note without recurrence (should NOT be returned)
		const noteOneShot = await Note.save({
			title: 'one-shot',
			parent_id: folder.id,
			is_todo: 1,
			todo_due: pastTime,
			todo_due_recurrence: '',
		});

		// Completed note with recurrence (should NOT be returned)
		const noteCompleted = await Note.save({
			title: 'completed recurring',
			parent_id: folder.id,
			is_todo: 1,
			todo_due: pastTime,
			todo_due_recurrence: RecurrenceInterval.Daily,
			todo_completed: Date.now(),
		});

		await Alarm.save({ note_id: noteRecurring.id, trigger_time: pastTime });
		await Alarm.save({ note_id: noteOneShot.id, trigger_time: pastTime });
		await Alarm.save({ note_id: noteCompleted.id, trigger_time: pastTime });

		const expiredRecurring = await Alarm.expiredAlarmsWithRecurrence();

		// Only the uncompleted recurring alarm should be returned
		expect(expiredRecurring.length).toBe(1);
		expect(expiredRecurring[0].note_id).toBe(noteRecurring.id);
		expect(expiredRecurring[0].todo_due_recurrence).toBe(RecurrenceInterval.Weekly);
		expect(expiredRecurring[0].todo_due).toBe(pastTime);
	});

	it('should not return conflict notes in expiredAlarmsWithRecurrence', async () => {
		const folder = await Folder.save({ title: 'folder' });
		const pastTime = Date.now() - 60000;

		const conflictNote = await Note.save({
			title: 'conflict recurring',
			parent_id: folder.id,
			is_todo: 1,
			todo_due: pastTime,
			todo_due_recurrence: RecurrenceInterval.Daily,
			is_conflict: 1,
		});

		await Alarm.save({ note_id: conflictNote.id, trigger_time: pastTime });

		const expiredRecurring = await Alarm.expiredAlarmsWithRecurrence();
		expect(expiredRecurring.length).toBe(0);
	});

	it('should include todo_due_recurrence in dueNotes', async () => {
		const folder = await Folder.save({ title: 'folder' });
		const futureTime = Date.now() + 3600000; // 1 hour from now

		await Note.save({
			title: 'future recurring',
			parent_id: folder.id,
			is_todo: 1,
			todo_due: futureTime,
			todo_due_recurrence: RecurrenceInterval.Monthly,
		});

		const dueNotes = await Note.dueNotes();
		expect(dueNotes.length).toBe(1);
		expect(dueNotes[0].todo_due_recurrence).toBe(RecurrenceInterval.Monthly);
	});

	it('should clear todo_due_recurrence when changing note type to note', async () => {
		const folder = await Folder.save({ title: 'folder' });
		let note = await Note.save({
			title: 'todo with recurrence',
			parent_id: folder.id,
			is_todo: 1,
			todo_due: Date.now() + 3600000,
			todo_due_recurrence: RecurrenceInterval.Yearly,
		});

		// Change from to-do to note
		const changedNote = Note.changeNoteType(note, 'note');
		expect(changedNote.todo_due_recurrence).toBe('');
		expect(changedNote.todo_due).toBe(0);

		// Save and reload
		await Note.save(changedNote);
		note = await Note.load(note.id);
		expect(note.todo_due_recurrence).toBe('');
	});

	it('should save and load todo_due_recurrence correctly', async () => {
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({
			title: 'test save',
			parent_id: folder.id,
			is_todo: 1,
			todo_due: Date.now() + 3600000,
			todo_due_recurrence: RecurrenceInterval.Weekly,
		});

		const loaded = await Note.load(note.id);
		expect(loaded.todo_due_recurrence).toBe(RecurrenceInterval.Weekly);
	});

	it('should save empty recurrence when clearing alarm', async () => {
		const folder = await Folder.save({ title: 'folder' });
		let note = await Note.save({
			title: 'test clear',
			parent_id: folder.id,
			is_todo: 1,
			todo_due: Date.now() + 3600000,
			todo_due_recurrence: RecurrenceInterval.Daily,
		});

		// Clear the alarm
		await Note.save({
			id: note.id,
			todo_due: 0,
			todo_due_recurrence: '',
		});

		note = await Note.load(note.id);
		expect(note.todo_due).toBe(0);
		expect(note.todo_due_recurrence).toBe('');
	});
});
