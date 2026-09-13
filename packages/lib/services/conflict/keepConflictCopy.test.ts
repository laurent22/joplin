import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import Note from '../../models/Note';
import Folder from '../../models/Folder';
import keepConflictCopy, { KeepStatus, titleForCopy } from './keepConflictCopy';

const createConflict = async (title = 'Title') => {
	const folder = await Folder.save({ title: 'Notebook' });
	const original = await Note.save({ title, body: 'theirs', parent_id: folder.id });
	const conflictNote = await Note.save({ title, body: 'mine', is_conflict: 1, conflict_original_id: original.id });
	return { folder, original, conflictNote };
};

describe('keepConflictCopy', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	test.each([
		['no copy exists yet', [], 'Note (conflicted copy)'],
		['the first one is taken', ['Note (conflicted copy)'], 'Note (conflicted copy 2)'],
		['several are taken', ['Note (conflicted copy)', 'Note (conflicted copy 2)'], 'Note (conflicted copy 3)'],
		['a number was skipped', ['Note (conflicted copy)', 'Note (conflicted copy 5)'], 'Note (conflicted copy 6)'],
		['another note has copies', ['Other (conflicted copy)'], 'Note (conflicted copy)'],
	])('should name the copy when %s', (_name, taken, expected) => {
		expect(titleForCopy('Note', taken)).toBe(expected);
	});

	test('should not be confused by regular expression characters in the title', () => {
		expect(titleForCopy('A (b) [c]', ['A (b) [c] (conflicted copy)'])).toBe('A (b) [c] (conflicted copy 2)');
	});

	test('should keep the note beside the original and clear the conflict', async () => {
		const { folder, conflictNote } = await createConflict();

		const result = await keepConflictCopy(conflictNote.id);
		const kept = await Note.load(conflictNote.id);

		expect(result.status).toBe(KeepStatus.Ok);
		expect(kept.title).toBe('Title (conflicted copy)');
		expect(kept.is_conflict).toBe(0);
		expect(kept.conflict_original_id).toBe('');
		expect(kept.parent_id).toBe(folder.id);
	});

	test('should leave the original untouched', async () => {
		const { original, conflictNote } = await createConflict();

		await keepConflictCopy(conflictNote.id);
		const after = await Note.load(original.id);

		expect(after.body).toBe('theirs');
		expect(after.title).toBe('Title');
	});

	test('should number a second copy of the same note', async () => {
		const { conflictNote } = await createConflict();
		await keepConflictCopy(conflictNote.id);

		const { conflictNote: second } = await createConflict();
		const result = await keepConflictCopy(second.id);

		expect(result.title).toBe('Title (conflicted copy 2)');
	});

	test('should not reuse a number when the title contains LIKE wildcards', async () => {
		// % and _ are wildcards, so the search has to treat them as ordinary characters
		const { conflictNote } = await createConflict('100% a_b');
		await Note.save({ title: '100% a_b (conflicted copy)' });

		const result = await keepConflictCopy(conflictNote.id);

		expect(result.title).toBe('100% a_b (conflicted copy 2)');
	});

	test('should report a note that is not a conflict', async () => {
		const note = await Note.save({ title: 'Plain' });
		expect((await keepConflictCopy(note.id)).status).toBe(KeepStatus.Unavailable);
	});

	test('should report a conflict whose original is gone', async () => {
		const { original, conflictNote } = await createConflict();
		await Note.delete(original.id, { toTrash: false });

		expect((await keepConflictCopy(conflictNote.id)).status).toBe(KeepStatus.Unavailable);
	});


	test('should point at the next conflict so the editor can move on', async () => {
		const { conflictNote } = await createConflict('First');
		const { conflictNote: other } = await createConflict('Second');

		const result = await keepConflictCopy(conflictNote.id);

		expect(result.nextConflictId).toBe(other.id);
	});

	test('should point at nothing when that was the last conflict', async () => {
		const { conflictNote } = await createConflict();

		const result = await keepConflictCopy(conflictNote.id);

		expect(result.nextConflictId).toBe('');
	});

});
