import { synchronizerStart, setupDatabaseAndSynchronizer, switchClient, synchronizer } from '../../testing/test-utils';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import ConflictNoteState from '../../models/ConflictNoteState';
import { NoteEntity } from '../database/types';

// Sets up a three-way merge for the given note: client 2 makes its change and
// syncs first (becoming the remote version), then client 1 makes its change
// and syncs, which triggers conflict detection and the auto-merge attempt.
const makeConcurrentEdits = async (noteId: string, client2Changes: NoteEntity, client1Changes: NoteEntity) => {
	await switchClient(2);
	await synchronizerStart();
	await Note.save({ id: noteId, ...client2Changes });
	await synchronizerStart();

	await switchClient(1);
	await Note.save({ id: noteId, ...client1Changes });
	await synchronizerStart();
};

const baseBody = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';

describe('Synchronizer.autoMerge', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
	});

	it('should fully auto-merge non-overlapping body edits without creating a conflict note', (async () => {
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'Title', body: baseBody, parent_id: folder.id });
		await synchronizerStart();

		await makeConcurrentEdits(
			note.id,
			{ body: baseBody.replace('Third paragraph.', 'Third paragraph, edited remotely.') },
			{ body: baseBody.replace('First paragraph.', 'First paragraph, edited locally.') },
		);

		expect(await Note.conflictedNotes()).toHaveLength(0);

		const merged = await Note.load(note.id);
		expect(merged.body).toContain('First paragraph, edited locally.');
		expect(merged.body).toContain('Third paragraph, edited remotely.');

		// The merged result is uploaded on the next sync and reaches the other client.
		await synchronizerStart();
		await switchClient(2);
		await synchronizerStart();
		const onClient2 = await Note.load(note.id);
		expect(onClient2.body).toBe(merged.body);
	}));

	it('should partially merge and still create a conflict note when one section genuinely conflicts', (async () => {
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'Title', body: baseBody, parent_id: folder.id });
		await synchronizerStart();

		// First paragraph: only local changes it (auto-mergeable).
		// Second paragraph: both sides change it differently (genuine conflict).
		const remoteBody = baseBody
			.replace('Second paragraph.', 'Second paragraph, remote.');
		const localBody = baseBody
			.replace('First paragraph.', 'First paragraph, edited locally.')
			.replace('Second paragraph.', 'Second paragraph, local.');

		await makeConcurrentEdits(note.id, { body: remoteBody }, { body: localBody });

		const conflicts = await Note.conflictedNotes();
		expect(conflicts).toHaveLength(1);
		const conflictNote = conflicts[0];

		// The non-conflicting change (first paragraph) is merged into both the
		// conflict note and the resolved original note.
		expect(conflictNote.body).toContain('First paragraph, edited locally.');
		const resolved = await Note.load(note.id);
		expect(resolved.body).toContain('First paragraph, edited locally.');

		// The still-conflicting section keeps each side's own text.
		expect(conflictNote.body).toContain('Second paragraph, local.');
		expect(resolved.body).toContain('Second paragraph, remote.');

		// The conflict state's remote_body is saved in the database, not just kept in
		// memory. It contains the same partial merge as the resolved note, so the
		// conflict resolution UI later reads a consistent version. It never contains
		// raw Git conflict markers.
		const state = await ConflictNoteState.byNoteId(conflictNote.id);
		expect(state.remote_body).toBe(resolved.body);
		expect(state.remote_body).toContain('First paragraph, edited locally.');
		expect(state.remote_body).toContain('Second paragraph, remote.');
		expect(state.remote_body).not.toContain('<<<<<<<');
		expect(state.base_body).toBe(baseBody);
	}));

	it('should create an unmerged conflict note when both sides change the same line with no non-conflicting changes', (async () => {
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'Title', body: baseBody, parent_id: folder.id });
		await synchronizerStart();

		const remoteBody = baseBody.replace('Second paragraph.', 'Second paragraph, remote.');
		await makeConcurrentEdits(
			note.id,
			{ body: remoteBody },
			{ body: baseBody.replace('Second paragraph.', 'Second paragraph, local.') },
		);

		const conflicts = await Note.conflictedNotes();
		expect(conflicts).toHaveLength(1);
		expect((await Note.load(note.id)).body).toBe(remoteBody);
	}));

	it('should fully auto-merge a title change on one side with a body change on the other', (async () => {
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'Title', body: baseBody, parent_id: folder.id });
		await synchronizerStart();

		await makeConcurrentEdits(
			note.id,
			{ title: 'Remote title' },
			{ body: baseBody.replace('First paragraph.', 'First paragraph, edited locally.') },
		);

		expect(await Note.conflictedNotes()).toHaveLength(0);

		const merged = await Note.load(note.id);
		expect(merged.title).toBe('Remote title');
		expect(merged.body).toContain('First paragraph, edited locally.');
	}));

	it('should create a conflict note when both sides changed the title differently', (async () => {
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'Title', body: baseBody, parent_id: folder.id });
		await synchronizerStart();

		await makeConcurrentEdits(
			note.id,
			{ title: 'Remote title' },
			{ title: 'Local title' },
		);

		expect(await Note.conflictedNotes()).toHaveLength(1);
		expect((await Note.load(note.id)).title).toBe('Remote title');
	}));

	it('should not record a base for a note this client only downloaded', (async () => {
		const note = await Note.save({ title: 'down title', body: 'down body' });
		await synchronizerStart();

		// Client 2 only ever downloads this note, it never uploads it, so it never
		// records a base for it.
		await switchClient(2);
		await synchronizerStart();
		await switchClient(1);

		await Note.save({ id: note.id, body: 'client 1 edit' });
		await synchronizerStart();
		await switchClient(2);
		await Note.save({ id: note.id, body: 'client 2 edit' });
		await synchronizerStart();

		// No base means no attribution is possible, so the conflict is left for the
		// user rather than risking an incorrect merge.
		const conflicts = await Note.conflictedNotes();
		expect(conflicts).toHaveLength(1);
		const state = await ConflictNoteState.byNoteId(conflicts[0].id);
		expect(state.base_body).toBe('');
	}));

	it('should skip auto-merge for locked notes and fall back to a plain conflict note', (async () => {
		// Locked notes (note-locking project) do not use the new conflict resolution
		// flow. So even non-overlapping changes that could be merged automatically
		// will create a normal conflict note instead.
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'Title', body: baseBody, is_locked: 1, parent_id: folder.id });
		await synchronizerStart();

		await makeConcurrentEdits(
			note.id,
			{ body: baseBody.replace('Third paragraph.', 'Third paragraph, edited remotely.'), is_locked: 1 },
			{ body: baseBody.replace('First paragraph.', 'First paragraph, edited locally.'), is_locked: 1 },
		);

		// A conflict note is created despite the edits being non-overlapping.
		const conflicts = await Note.conflictedNotes();
		expect(conflicts).toHaveLength(1);

		// The local conflict note keeps the user's original changes, with no remote
		// changes merged into it. This confirms that auto-merge was skipped.
		expect(conflicts[0].body).toContain('First paragraph, edited locally.');
		expect(conflicts[0].body).not.toContain('Third paragraph, edited remotely.');
	}));

	it('should skip auto-merge for read-only items and keep the local change as a conflict note', (async () => {
		// A read-only item cannot have its local change pushed to the sync target, so
		// the change must be preserved as a conflict note. Even a title change that
		// only one side made (which would normally auto-merge) must not be applied.
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'un', parent_id: folder.id });
		await synchronizerStart();

		await Note.save({ id: note.id, title: 'un mod' });
		synchronizer().testingHooks_ = ['itemIsReadOnly'];
		await synchronizerStart();
		synchronizer().testingHooks_ = [];

		// The original note keeps the read-only remote title, not the merged one.
		expect((await Note.load(note.id)).title).toBe('un');

		// The user's change is preserved as a conflict note.
		const conflicts = await Note.conflictedNotes();
		expect(conflicts).toHaveLength(1);
		expect(conflicts[0].title).toBe('un mod');
	}));
});
