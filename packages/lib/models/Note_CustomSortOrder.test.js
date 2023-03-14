const time = require('../time').default;
const { setupDatabaseAndSynchronizer, switchClient } = require('../testing/test-utils.js');
const Folder = require('../models/Folder').default;
const Note = require('../models/Note').default;

describe('models/Note_CustomSortOrder', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should set the order property when saving a note', (async () => {
		const now = Date.now();
		const n1 = await Note.save({ title: 'testing' });
		expect(n1.order).toBeGreaterThanOrEqual(now);

		const n2 = await Note.save({ title: 'testing', order: 0 });
		expect(n2.order).toBe(0);
	}));

	it('should insert notes at the specified position (order 0)', (async () => {
		// Notes always had an "order" property, but for a long time it wasn't used, and
		// set to 0. For custom sorting to work though, it needs to be set to some number
		// (which normally is the creation timestamp). So if the user tries to move notes
		// in the middle of other notes with order = 0, the order of all these notes is
		// initialised at this point.
		// Also check that the order-0 notes stay in their previous position when their
		// order values are initialized. There was at one point a bug where they popped to
		// the top.

		const folder1 = await Folder.save({});
		const folder2 = await Folder.save({});

		const notes1 = [];
		notes1.push(await Note.save({ order: 0, parent_id: folder1.id })); await time.msleep(2);
		notes1.push(await Note.save({ order: 0, parent_id: folder1.id })); await time.msleep(2);
		notes1.push(await Note.save({ order: 0, parent_id: folder1.id })); await time.msleep(2);
		notes1.push(await Note.save({ order: 1000, parent_id: folder1.id })); await time.msleep(2);

		const notes2 = [];
		notes2.push(await Note.save({ parent_id: folder2.id })); await time.msleep(2);
		notes2.push(await Note.save({ parent_id: folder2.id })); await time.msleep(2);

		const originalTimestamps = {};
		for (const n of notes1) {
			originalTimestamps[n.id] = {
				user_created_time: n.user_created_time,
				user_updated_time: n.user_updated_time,
			};
		}

		await Note.insertNotesAt(folder1.id, notes2.map(n => n.id), 2);

		const newNotes1 = [
			await Note.load(notes1[0].id),
			await Note.load(notes1[1].id),
			await Note.load(notes1[2].id),
			await Note.load(notes1[3].id),
		];

		// Check that timestamps haven't changed - moving a note should not change the user timestamps
		for (let i = 0; i < newNotes1.length; i++) {
			const n = newNotes1[i];
			expect(n.user_created_time).toBe(originalTimestamps[n.id].user_created_time);
			expect(n.user_updated_time).toBe(originalTimestamps[n.id].user_updated_time);
		}

		const sortedNotes = await Note.previews(folder1.id, {
			order: Note.customOrderByColumns(),
		});

		expect(sortedNotes.length).toBe(6);
		expect(sortedNotes[0].id).toBe(notes1[3].id);
		expect(sortedNotes[1].id).toBe(notes1[2].id);
		expect(sortedNotes[2].id).toBe(notes2[0].id);
		expect(sortedNotes[3].id).toBe(notes2[1].id);
		expect(sortedNotes[4].id).toBe(notes1[1].id);
		expect(sortedNotes[5].id).toBe(notes1[0].id);
	}));

	it('should bump system but not user updated time when changing sort value', (async () => {
		const folder1 = await Folder.save({ title: 'Folder' });
		const note0 = await Note.save({ title: 'A3', parent_id: folder1.id, is_todo: 0, order: 3 });
		const note1 = await Note.save({ title: 'A20', parent_id: folder1.id, is_todo: 0, order: 2 });
		const note2 = await Note.save({ title: 'A100', parent_id: folder1.id, is_todo: 0, order: 1 });

		const sortedNotes1 = await Note.previews(folder1.id, {
			fields: ['id', 'title'],
			order: Note.customOrderByColumns(),
		});
		expect(sortedNotes1.length).toBe(3);
		expect(sortedNotes1[0].id).toBe(note0.id);
		expect(sortedNotes1[1].id).toBe(note1.id);
		expect(sortedNotes1[2].id).toBe(note2.id);

		const timeBefore = time.unixMs();

		await Note.insertNotesAt(folder1.id, [note2.id], 0);
		await Note.insertNotesAt(folder1.id, [note1.id], 1);

		const sortedNotes2 = await Note.previews(folder1.id, {
			fields: ['id', 'title', 'updated_time', 'user_updated_time'],
			order: Note.customOrderByColumns(),
		});
		expect(sortedNotes2.length).toBe(3);
		expect(sortedNotes2[0].id).toBe(note2.id);
		expect(sortedNotes2[1].id).toBe(note1.id);
		expect(sortedNotes2[2].id).toBe(note0.id);

		expect(sortedNotes2[0].updated_time).toBeGreaterThan(timeBefore);
		expect(sortedNotes2[1].updated_time).toBeGreaterThan(timeBefore);
		expect(sortedNotes2[2].updated_time).toBeLessThan(timeBefore);

		expect(sortedNotes2[0].user_updated_time).toBeLessThan(timeBefore);
		expect(sortedNotes2[1].user_updated_time).toBeLessThan(timeBefore);
		expect(sortedNotes2[2].user_updated_time).toBeLessThan(timeBefore);
	}));

	it('should insert notes at the specified position (targets with same orders)', (async () => {
		// If the target notes all have the same order, inserting a note should work
		// anyway, because the order of the other notes will be updated as needed.

		const folder1 = await Folder.save({});

		const notes = [];
		notes.push(await Note.save({ order: 1000, parent_id: folder1.id })); await time.msleep(2);
		notes.push(await Note.save({ order: 1000, parent_id: folder1.id })); await time.msleep(2);
		notes.push(await Note.save({ order: 1000, parent_id: folder1.id })); await time.msleep(2);
		notes.push(await Note.save({ order: 1000, parent_id: folder1.id })); await time.msleep(2);

		await Note.insertNotesAt(folder1.id, [notes[0].id], 1);

		const sortedNotes = await Note.previews(folder1.id, {
			order: Note.customOrderByColumns(),
		});

		expect(sortedNotes.length).toBe(4);
		expect(sortedNotes[0].id).toBe(notes[3].id);
		expect(sortedNotes[1].id).toBe(notes[0].id);
		expect(sortedNotes[2].id).toBe(notes[2].id);
		expect(sortedNotes[3].id).toBe(notes[1].id);
	}));

	it('should insert notes at the specified position (insert at end)', (async () => {
		const folder1 = await Folder.save({});

		const notes = [];
		notes.push(await Note.save({ order: 1000, parent_id: folder1.id })); await time.msleep(2);
		notes.push(await Note.save({ order: 1000, parent_id: folder1.id })); await time.msleep(2);
		notes.push(await Note.save({ order: 1000, parent_id: folder1.id })); await time.msleep(2);
		notes.push(await Note.save({ order: 1000, parent_id: folder1.id })); await time.msleep(2);

		await Note.insertNotesAt(folder1.id, [notes[1].id], 4);

		const sortedNotes = await Note.previews(folder1.id, {
			fields: ['id', 'order', 'user_created_time'],
			order: Note.customOrderByColumns(),
		});

		expect(sortedNotes.length).toBe(4);
		expect(sortedNotes[0].id).toBe(notes[3].id);
		expect(sortedNotes[1].id).toBe(notes[2].id);
		expect(sortedNotes[2].id).toBe(notes[0].id);
		expect(sortedNotes[3].id).toBe(notes[1].id);
	}));

	it('should insert notes at the specified position (insert at beginning)', (async () => {
		const folder1 = await Folder.save({});

		const notes = [];
		notes.push(await Note.save({ order: 1000, parent_id: folder1.id })); await time.msleep(2);
		notes.push(await Note.save({ order: 1000, parent_id: folder1.id })); await time.msleep(2);
		notes.push(await Note.save({ order: 1000, parent_id: folder1.id })); await time.msleep(2);
		notes.push(await Note.save({ order: 1000, parent_id: folder1.id })); await time.msleep(2);

		await Note.insertNotesAt(folder1.id, [notes[2].id], 0);

		const sortedNotes = await Note.previews(folder1.id, {
			fields: ['id', 'order', 'user_created_time'],
			order: Note.customOrderByColumns(),
		});

		expect(sortedNotes.length).toBe(4);
		expect(sortedNotes[0].id).toBe(notes[2].id);
		expect(sortedNotes[1].id).toBe(notes[3].id);
		expect(sortedNotes[2].id).toBe(notes[1].id);
		expect(sortedNotes[3].id).toBe(notes[0].id);
	}));

	it('should insert notes even if sources are not adjacent', (async () => {
		const folder1 = await Folder.save({});

		const notes = [];
		notes.push(await Note.save({ order: 1000, parent_id: folder1.id })); await time.msleep(2);
		notes.push(await Note.save({ order: 1000, parent_id: folder1.id })); await time.msleep(2);
		notes.push(await Note.save({ order: 1000, parent_id: folder1.id })); await time.msleep(2);
		notes.push(await Note.save({ order: 1000, parent_id: folder1.id })); await time.msleep(2);

		await Note.insertNotesAt(folder1.id, [notes[1].id, notes[3].id], 0);

		const sortedNotes = await Note.previews(folder1.id, {
			fields: ['id', 'order', 'user_created_time'],
			order: Note.customOrderByColumns(),
		});

		expect(sortedNotes.length).toBe(4);
		expect(sortedNotes[0].id).toBe(notes[1].id);
		expect(sortedNotes[1].id).toBe(notes[3].id);
		expect(sortedNotes[2].id).toBe(notes[2].id);
		expect(sortedNotes[3].id).toBe(notes[0].id);
	}));

	it('should account for completion-hidden and uncompleted-on-top todos', (async () => {
		const folder1 = await Folder.save({});

		const notes = [];
		notes.push(await Note.save({ order: 1006, parent_id: folder1.id, is_todo: true, todo_completed: time.unixMs() })); await time.msleep(2);
		notes.push(await Note.save({ order: 1005, parent_id: folder1.id, is_todo: true })); await time.msleep(2);
		notes.push(await Note.save({ order: 1004, parent_id: folder1.id })); await time.msleep(2);
		notes.push(await Note.save({ order: 1003, parent_id: folder1.id })); await time.msleep(2);
		notes.push(await Note.save({ order: 1002, parent_id: folder1.id })); await time.msleep(2);
		notes.push(await Note.save({ order: 1001, parent_id: folder1.id, is_todo: true })); await time.msleep(2);
		notes.push(await Note.save({ order: 1000, parent_id: folder1.id, is_todo: true })); await time.msleep(2);

		const sortNotes = async () => await Note.previews(folder1.id, {
			fields: ['id', 'order', 'user_created_time', 'is_todo', 'todo_completed'],
			order: Note.customOrderByColumns(),
			uncompletedTodosOnTop: true,
			showCompletedTodos: false,
		});

		// Initial sort is as expected in UI, with completed item missing, and uncompleted
		// todos at top.
		const initialSortedNotes = await sortNotes();
		expect(initialSortedNotes.length).toBe(6);
		expect(initialSortedNotes[0].id).toBe(notes[1].id);
		expect(initialSortedNotes[1].id).toBe(notes[5].id);
		expect(initialSortedNotes[2].id).toBe(notes[6].id);
		expect(initialSortedNotes[3].id).toBe(notes[2].id);
		expect(initialSortedNotes[4].id).toBe(notes[3].id);
		expect(initialSortedNotes[5].id).toBe(notes[4].id);

		// Regular reorder - place a note within its window
		await Note.insertNotesAt(folder1.id, [initialSortedNotes[5].id], 4, true, false);

		// Post-reorder, the updated note is at the index requested
		const resortedNotes1 = await sortNotes();
		expect(resortedNotes1.length).toBe(6);
		expect(resortedNotes1[0].id).toBe(initialSortedNotes[0].id);
		expect(resortedNotes1[1].id).toBe(initialSortedNotes[1].id);
		expect(resortedNotes1[2].id).toBe(initialSortedNotes[2].id);
		expect(resortedNotes1[3].id).toBe(initialSortedNotes[3].id);
		expect(resortedNotes1[4].id).toBe(initialSortedNotes[5].id);
		expect(resortedNotes1[5].id).toBe(initialSortedNotes[4].id);

		// Limit reorder - place the note into another window
		await Note.insertNotesAt(folder1.id, [resortedNotes1[4].id], 2, true, false);

		// Post-reorder, the updated note is not at the index requested, but
		// as close as possible: at the top edge of its window.
		const resortedNotes2 = await sortNotes();
		expect(resortedNotes2.length).toBe(6);
		expect(resortedNotes2[0].id).toBe(resortedNotes1[0].id);
		expect(resortedNotes2[1].id).toBe(resortedNotes1[1].id);
		expect(resortedNotes2[2].id).toBe(resortedNotes1[2].id);
		expect(resortedNotes2[3].id).toBe(resortedNotes1[4].id);
		expect(resortedNotes2[4].id).toBe(resortedNotes1[3].id);
		expect(resortedNotes2[5].id).toBe(resortedNotes1[5].id);

		// Limit reorder - place an uncompleted todo into another window
		await Note.insertNotesAt(folder1.id, [resortedNotes2[0].id], 4, true, false);

		// Post-reorder, the updated todo is not at the index requested, but
		// as close as possible: at the lower edge of its window.
		const resortedNotes3 = await sortNotes();
		expect(resortedNotes3.length).toBe(6);
		expect(resortedNotes3[0].id).toBe(resortedNotes2[1].id);
		expect(resortedNotes3[1].id).toBe(resortedNotes2[2].id);
		expect(resortedNotes3[2].id).toBe(resortedNotes2[0].id);
		expect(resortedNotes3[3].id).toBe(resortedNotes2[3].id);
		expect(resortedNotes3[4].id).toBe(resortedNotes2[4].id);
		expect(resortedNotes3[5].id).toBe(resortedNotes2[5].id);
	}));

});
