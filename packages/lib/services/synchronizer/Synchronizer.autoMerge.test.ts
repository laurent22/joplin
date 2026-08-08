import { synchronizerStart, setupDatabaseAndSynchronizer, switchClient, synchronizer, loadEncryptionMasterKey, encryptionService, decryptionWorker } from '../../testing/test-utils';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import Setting from '../../models/Setting';
import ConflictNoteState from '../../models/ConflictNoteState';
import { NoteEntity } from '../database/types';
import { MasterKeyEntity } from '../e2ee/types';
import { setEncryptionEnabled } from './syncInfoUtils';
import { loadMasterKeysFromSettings } from '../e2ee/utils';

// Auto-merge is off by default and runs on the client that detects the conflict
// (client 1 here), so only that client needs it be enabled
const enableAutoMerge = () => {
	Setting.setValue('sync.autoMergeConflicts', true);
};

const enableEncryption = async () => {
	setEncryptionEnabled(true);
	return loadEncryptionMasterKey();
};

// A client that receives the master key by sync still needs the password before it
// can read encrypted items.
const loadMasterKey = async (masterKey: MasterKeyEntity) => {
	Setting.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
	await loadMasterKeysFromSettings(encryptionService());
	await decryptionWorker().start();
};

// Client 2 edits and syncs first (becoming the remote), then client 1 edits and
// syncs, which is when the conflict is detected on client 1.
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
		enableAutoMerge();
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

		expect(conflictNote.body).toContain('First paragraph, edited locally.');
		const resolved = await Note.load(note.id);
		expect(resolved.body).toContain('First paragraph, edited locally.');

		expect(conflictNote.body).toContain('Second paragraph, local.');
		expect(resolved.body).toContain('Second paragraph, remote.');
		expect(resolved.body).not.toContain('<<<<<<<');

		// The remote version is the original note, so only its updated_time is stored
		const state = await ConflictNoteState.byNoteId(conflictNote.id);
		expect(state.base_body).toBe(baseBody);
		expect(state.remote_updated_time).toBe(resolved.updated_time);

		// The merged changes must upload, or the other device never receives them
		await synchronizerStart();
		await switchClient(2);
		await synchronizerStart();
		expect((await Note.load(note.id)).body).toBe(resolved.body);
	}));

	it('should not update the note when the merge changed nothing on the remote side', (async () => {
		// The title conflicts and the bodies are untouched, so the merge leaves the remote
		// version exactly as it was and it doesn't need uploading again
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'Title', body: baseBody, parent_id: folder.id });
		await synchronizerStart();

		await switchClient(2);
		await synchronizerStart();
		await Note.save({ id: note.id, title: 'Remote title' });
		const remoteUpdatedTime = (await Note.load(note.id)).updated_time;
		await synchronizerStart();

		await switchClient(1);
		await Note.save({ id: note.id, title: 'Local title' });
		await synchronizerStart();

		expect(await Note.conflictedNotes()).toHaveLength(1);
		expect((await Note.load(note.id)).updated_time).toBe(remoteUpdatedTime);
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

		const conflicts = await Note.conflictedNotes();
		expect(conflicts).toHaveLength(1);

		// Auto-merge was skipped: no remote change folded into the conflict note.
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

		expect((await Note.load(note.id)).title).toBe('un');

		const conflicts = await Note.conflictedNotes();
		expect(conflicts).toHaveLength(1);
		expect(conflicts[0].title).toBe('un mod');
	}));

	it('should not auto-merge when the setting is disabled', (async () => {
		// With the setting off, even non-overlapping changes create a normal conflict
		// note instead of being merged.
		Setting.setValue('sync.autoMergeConflicts', false);

		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'Title', body: baseBody, parent_id: folder.id });
		await synchronizerStart();

		await makeConcurrentEdits(
			note.id,
			{ body: baseBody.replace('Third paragraph.', 'Third paragraph, edited remotely.') },
			{ body: baseBody.replace('First paragraph.', 'First paragraph, edited locally.') },
		);

		expect(await Note.conflictedNotes()).toHaveLength(1);
	}));

	it('should auto-merge when the remote note is encrypted', (async () => {
		const masterKey = await enableEncryption();

		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'Title', body: baseBody, parent_id: folder.id });
		await synchronizerStart();

		await switchClient(2);
		await synchronizerStart();
		await loadMasterKey(masterKey);
		await Note.save({ id: note.id, body: baseBody.replace('Third paragraph.', 'Third paragraph, edited remotely.') });
		await synchronizerStart();

		await switchClient(1);
		await Note.save({ id: note.id, body: baseBody.replace('First paragraph.', 'First paragraph, edited locally.') });
		await synchronizerStart();

		expect(await Note.conflictedNotes()).toHaveLength(0);

		const merged = await Note.load(note.id);
		expect(merged.body).toContain('First paragraph, edited locally.');
		expect(merged.body).toContain('Third paragraph, edited remotely.');
		expect(merged.encryption_applied).toBeFalsy();
	}));

	it('should partially merge an encrypted remote note', (async () => {
		// The resolution UI reads the remote version from the original note, so the
		// decrypted content has to reach it rather than staying as cipher text
		const masterKey = await enableEncryption();

		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'Title', body: baseBody, parent_id: folder.id });
		await synchronizerStart();

		await switchClient(2);
		await synchronizerStart();
		await loadMasterKey(masterKey);
		await Note.save({ id: note.id, body: baseBody.replace('Second paragraph.', 'Second paragraph, remote.') });
		await synchronizerStart();

		await switchClient(1);
		await Note.save({ id: note.id, body: baseBody.replace('Second paragraph.', 'Second paragraph, local.') });
		await synchronizerStart();

		const conflicts = await Note.conflictedNotes();
		expect(conflicts).toHaveLength(1);
		expect(conflicts[0].body).toContain('Second paragraph, local.');

		const resolved = await Note.load(note.id);
		expect(resolved.body).toContain('Second paragraph, remote.');
		expect(resolved.title).toBe('Title');

		const state = await ConflictNoteState.byNoteId(conflicts[0].id);
		expect(state.remote_updated_time).toBe(resolved.updated_time);
	}));

	it('should create a plain conflict note when the remote note cannot be decrypted', (async () => {
		const masterKey = await enableEncryption();

		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'Title', body: baseBody, parent_id: folder.id });
		await synchronizerStart();

		await switchClient(2);
		await synchronizerStart();
		await loadMasterKey(masterKey);
		await Note.save({ id: note.id, body: baseBody.replace('Third paragraph.', 'Third paragraph, edited remotely.') });
		await synchronizerStart();

		await switchClient(1);
		// Drop the key so the incoming note can't be read
		encryptionService().unloadMasterKey(masterKey);
		await Note.save({ id: note.id, body: baseBody.replace('First paragraph.', 'First paragraph, edited locally.') });
		await synchronizerStart();

		// The local change is preserved as a conflict note and nothing is merged
		const conflicts = await Note.conflictedNotes();
		expect(conflicts).toHaveLength(1);
		expect(conflicts[0].body).toContain('First paragraph, edited locally.');
		expect(conflicts[0].body).not.toContain('Third paragraph, edited remotely.');
	}));
});
