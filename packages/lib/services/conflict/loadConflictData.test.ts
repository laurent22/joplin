import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import Note from '../../models/Note';
import Setting from '../../models/Setting';
import ConflictNoteState from '../../models/ConflictNoteState';
import loadConflictData, { ConflictDataStatus } from './loadConflictData';
import { ConflictNoteStateEntity } from '../database/types';

// The remote side is the original note, so the conflict note needs that note to exist.
const createConflictNote = async (body: string, title = 'Title') => {
	const original = await Note.save({ title, body: '' });
	return Note.save({ title, body, is_conflict: 1, conflict_original_id: original.id });
};

const saveState = async (noteId: string, state: Partial<ConflictNoteStateEntity> & { remote_body?: string; remote_title?: string }) => {
	const { remote_body: remoteBody, remote_title: remoteTitle, ...rest } = state;

	// Whatever the test calls the remote version is written to the original note
	const conflictNote = await Note.load(noteId);
	if (remoteBody !== undefined || remoteTitle !== undefined) {
		const original = await Note.load(conflictNote.conflict_original_id);
		await Note.save({
			id: original.id,
			body: remoteBody ?? original.body,
			title: remoteTitle ?? original.title,
		});
	}

	await ConflictNoteState.save({
		note_id: noteId,
		base_body: '',
		base_title: '',
		remote_updated_time: 0,
		...rest,
	});
};

describe('loadConflictData', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		Setting.setValue('featureFlag.conflictResolution', true);
	});

	test('should compare the two versions without merging them again', async () => {
		const note = await createConflictNote('one\ntwo\nthree');
		await saveState(note.id, {
			base_body: 'one\ntwo\nthree',
			remote_body: 'one\ntwo\nTHREE',
		});

		const data = await loadConflictData(note.id);

		expect(data.status).toBe(ConflictDataStatus.Ok);
		expect(data.sections.filter(s => s.type === 'conflict')).toHaveLength(1);
		expect(data.sections.some(s => s.type === 'auto-merged')).toBe(false);
	});

	test('should ignore the stored base when comparing', async () => {
		const note = await createConflictNote('one\nMINE');
		// An old base can make the three-way diff treat most of the note as one big change.
		await saveState(note.id, {
			base_body: 'something\nentirely\ndifferent\nand\nlonger',
			remote_body: 'one\nTHEIRS',
		});

		const data = await loadConflictData(note.id);

		const conflicts = data.sections.filter(s => s.type === 'conflict');
		expect(conflicts).toHaveLength(1);
		expect(conflicts[0].localText).toBe('MINE');
		expect(conflicts[0].remoteText).toBe('THEIRS');
	});

	test('should report a conflict section when both sides changed the same line', async () => {
		const note = await createConflictNote('one\nMINE');
		await saveState(note.id, {
			base_body: 'one\ntwo',
			remote_body: 'one\nTHEIRS',
		});

		const data = await loadConflictData(note.id);

		expect(data.status).toBe(ConflictDataStatus.Ok);
		const conflict = data.sections.find(s => s.type === 'conflict');
		expect(conflict).toBeTruthy();
		expect(conflict.localText).toBe('MINE');
		expect(conflict.remoteText).toBe('THEIRS');
	});

	test('should fall back to a two-way diff when there is no base', async () => {
		const note = await createConflictNote('same\nMINE');
		await saveState(note.id, { base_body: '', remote_body: 'same\nTHEIRS' });

		const data = await loadConflictData(note.id);

		expect(data.status).toBe(ConflictDataStatus.Ok);
		expect(data.sections.filter(s => s.type === 'unchanged').length).toBeGreaterThan(0);
		expect(data.sections.some(s => s.type === 'conflict')).toBe(true);
		expect(data.sections.some(s => s.type === 'auto-merged')).toBe(false);
	});

	test('should report the title versions and whether they differ', async () => {
		const note = await createConflictNote('body', 'My title');
		await saveState(note.id, { remote_body: 'body', remote_title: 'Their title' });

		const data = await loadConflictData(note.id);

		expect(data.localTitle).toBe('My title');
		expect(data.remoteTitle).toBe('Their title');
		expect(data.titleConflict).toBe(true);
	});

	test('should not flag a title conflict when both titles match', async () => {
		const note = await createConflictNote('body', 'Same');
		await saveState(note.id, { remote_body: 'body', remote_title: 'Same' });

		const data = await loadConflictData(note.id);

		expect(data.titleConflict).toBe(false);
	});

	test('should recompute on demand rather than reading stored sections', async () => {
		const note = await createConflictNote('one\ntwo');
		await saveState(note.id, { base_body: 'one\ntwo', remote_body: 'one\ntwo' });

		expect((await loadConflictData(note.id)).sections.some(s => s.type === 'conflict')).toBe(false);

		await saveState(note.id, { base_body: 'one\ntwo', remote_body: 'one\nTWO' });

		// Changes on the other side must show up without saving them.
		expect((await loadConflictData(note.id)).sections.some(s => s.type === 'conflict')).toBe(true);
	});

	test('should be unavailable when the feature flag is off', async () => {
		Setting.setValue('featureFlag.conflictResolution', false);
		const note = await createConflictNote('one\ntwo');
		await saveState(note.id, { base_body: 'one\ntwo', remote_body: 'one\nTWO' });

		const data = await loadConflictData(note.id);

		expect(data.status).toBe(ConflictDataStatus.Unavailable);
		expect(data.sections).toEqual([]);
	});

	test('should be unavailable when there is no state row', async () => {
		const note = await createConflictNote('body');

		const data = await loadConflictData(note.id);

		expect(data.status).toBe(ConflictDataStatus.Unavailable);
		expect(data.sections).toEqual([]);
	});

	test('should be unavailable when the note does not exist', async () => {
		const data = await loadConflictData('7a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d');

		expect(data.status).toBe(ConflictDataStatus.Unavailable);
	});

	test.each([
		['encrypted', { encryption_applied: 1 }],
		['locked', { is_locked: 1 }],
	])('should be unavailable when the note is %s', async (_label, fields) => {
		const note = await createConflictNote('body');
		await Note.save({ id: note.id, ...fields });
		await saveState(note.id, { base_body: 'body', remote_body: 'other' });

		const data = await loadConflictData(note.id);

		expect(data.status).toBe(ConflictDataStatus.Unavailable);
	});

});
