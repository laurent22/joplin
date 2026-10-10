import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import Note from '../../models/Note';
import ConflictNoteState from '../../models/ConflictNoteState';
import Folder from '../../models/Folder';
import Tag from '../../models/Tag';
import finishConflictResolution, { FinishStatus } from './finishConflictResolution';

const createConflict = async (options: { localBody?: string; remoteBody?: string; title?: string } = {}) => {
	const title = options.title ?? 'Title';
	const original = await Note.save({ title, body: options.remoteBody ?? 'theirs' });
	const conflictNote = await Note.save({ title, body: options.localBody ?? 'mine', is_conflict: 1, conflict_original_id: original.id });

	await ConflictNoteState.save({
		note_id: conflictNote.id,
		base_body: '',
		base_title: '',
		remote_updated_time: original.updated_time,
	});

	return { original, conflictNote, remoteUpdatedTime: original.updated_time };
};

describe('finishConflictResolution', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	test('should write the resolved version to the original and drop the conflict note', async () => {
		const { original, conflictNote, remoteUpdatedTime } = await createConflict();

		const result = await finishConflictResolution(conflictNote.id, { title: 'Resolved', body: 'resolved body', remoteUpdatedTime });

		expect(result.status).toBe(FinishStatus.Ok);
		expect(result.originalId).toBe(original.id);

		const saved = await Note.load(original.id);
		expect(saved.title).toBe('Resolved');
		expect(saved.body).toBe('resolved body');

		expect(await Note.load(conflictNote.id)).toBeFalsy();
	});

	test('should clear the conflict state when the conflict note is dropped', async () => {
		const { conflictNote, remoteUpdatedTime } = await createConflict();

		await finishConflictResolution(conflictNote.id, { title: 'Resolved', body: 'resolved body', remoteUpdatedTime });

		expect(await ConflictNoteState.byNoteId(conflictNote.id)).toBeFalsy();
	});

	test('should not delete the original along with the conflict note', async () => {
		const { original, conflictNote, remoteUpdatedTime } = await createConflict();

		await finishConflictResolution(conflictNote.id, { title: 'Resolved', body: 'resolved body', remoteUpdatedTime });

		const saved = await Note.load(original.id);
		expect(saved).toBeTruthy();
		expect(saved.is_conflict).toBeFalsy();
	});

	test('should refuse to save over an original that changed while it was being resolved', async () => {
		const { original, conflictNote, remoteUpdatedTime } = await createConflict();

		// Something arrived for the original after the conflict was created
		await Note.save({ id: original.id, body: 'arrived later' });

		const result = await finishConflictResolution(conflictNote.id, { title: 'Resolved', body: 'resolved body', remoteUpdatedTime });

		expect(result.status).toBe(FinishStatus.OriginalChanged);

		// Nothing was written and nothing was deleted, so the user can decide
		expect((await Note.load(original.id)).body).toBe('arrived later');
		expect(await Note.load(conflictNote.id)).toBeTruthy();
	});

	test('should accept a resolution built from the current original', async () => {
		const { original, conflictNote } = await createConflict();
		await Note.save({ id: original.id, body: 'arrived later' });
		const reloaded = await Note.load(original.id);

		const result = await finishConflictResolution(conflictNote.id, { title: 'Resolved', body: 'resolved body', remoteUpdatedTime: reloaded.updated_time });

		expect(result.status).toBe(FinishStatus.Ok);
		expect((await Note.load(original.id)).body).toBe('resolved body');
		expect(await Note.load(conflictNote.id)).toBeFalsy();
	});

	// A sync that landed before the note was opened is already part of the merge
	test('should allow finishing when the change predates the merge', async () => {
		const { original, conflictNote } = await createConflict();
		await Note.save({ id: original.id, body: 'arrived before opening' });
		const atOpen = await Note.load(original.id);

		const result = await finishConflictResolution(conflictNote.id, { title: 'Resolved', body: 'resolved body', remoteUpdatedTime: atOpen.updated_time });

		expect(result.status).toBe(FinishStatus.Ok);
	});

	test('should keep the original id, tags and folder', async () => {
		const folder = await Folder.save({ title: 'folder' });
		const original = await Note.save({ title: 'T', body: 'theirs', parent_id: folder.id });
		await Tag.addNoteTagByTitle(original.id, 'mytag');
		const conflictNote = await Note.save({ title: 'T', body: 'mine', is_conflict: 1, conflict_original_id: original.id, parent_id: folder.id });
		await ConflictNoteState.save({ note_id: conflictNote.id, base_body: '', base_title: '', remote_updated_time: original.updated_time });

		await finishConflictResolution(conflictNote.id, { title: 'T', body: 'resolved', remoteUpdatedTime: original.updated_time });

		const saved = await Note.load(original.id);
		expect(saved.id).toBe(original.id);
		expect(saved.parent_id).toBe(folder.id);
		expect(saved.is_conflict).toBeFalsy();
		expect((await Tag.tagsByNoteId(original.id)).map(t => t.title)).toEqual(['mytag']);
	});

	test.each([
		['a locked original', { is_locked: 1 }],
		['a trashed original', { deleted_time: Date.now() }],
	])('should refuse to write to %s and keep the conflict note', async (_description, changes) => {
		const { original, conflictNote, remoteUpdatedTime } = await createConflict();
		await Note.save({ id: original.id, ...changes }, { autoTimestamp: false });

		const result = await finishConflictResolution(conflictNote.id, { title: 'T', body: 'resolved', remoteUpdatedTime });

		expect(result.status).toBe(FinishStatus.CannotWrite);
		expect((await Note.load(original.id)).body).not.toBe('resolved');
		expect(await Note.load(conflictNote.id)).toBeTruthy();
	});

	test('should not delete the conflict note when saving the original fails', async () => {
		const { original, conflictNote, remoteUpdatedTime } = await createConflict();
		const saveSpy = jest.spyOn(Note, 'save').mockRejectedValueOnce(new Error('boom'));

		const result = await finishConflictResolution(conflictNote.id, { title: 'T', body: 'resolved', remoteUpdatedTime });
		saveSpy.mockRestore();

		expect(result.status).toBe(FinishStatus.CannotWrite);
		expect(await Note.load(conflictNote.id)).toBeTruthy();
		expect((await Note.load(original.id)).body).toBe('theirs');
	});

	test('should be a no-op when run twice', async () => {
		const { original, conflictNote, remoteUpdatedTime } = await createConflict();

		const first = await finishConflictResolution(conflictNote.id, { title: 'T', body: 'resolved', remoteUpdatedTime });
		const second = await finishConflictResolution(conflictNote.id, { title: 'T', body: 'other', remoteUpdatedTime });

		expect(first.status).toBe(FinishStatus.Ok);
		expect(second.status).toBe(FinishStatus.Unavailable);
		expect((await Note.load(original.id)).body).toBe('resolved');
	});

	test.each([
		['a note that is not a conflict', false],
		['a conflict note whose original is gone', true],
	])('should report %s as unavailable', async (_description, deleteOriginal) => {
		const { original, conflictNote, remoteUpdatedTime } = await createConflict();

		let noteId = conflictNote.id;
		if (deleteOriginal) {
			await Note.delete(original.id);
		} else {
			noteId = original.id;
		}

		const result = await finishConflictResolution(noteId, { title: 'Resolved', body: 'resolved body', remoteUpdatedTime });

		expect(result.status).toBe(FinishStatus.Unavailable);
	});
});
