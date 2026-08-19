import { synchronizerStart, setupDatabaseAndSynchronizer, switchClient, syncTargetId, loadEncryptionMasterKey, decryptionWorker, encryptionService } from '../../testing/test-utils';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import BaseItem from '../../models/BaseItem';
import ConflictNoteState from '../../models/ConflictNoteState';
import Setting from '../../models/Setting';
import { setEncryptionEnabled } from './syncInfoUtils';
import { loadMasterKeysFromSettings } from '../e2ee/utils';

// Creates a conflict on client 1 for the given note: client 2 edits and syncs first
// (becoming the remote/winning version), then client 1 edits and syncs, which is when
// the conflict is detected and resolved locally on client 1.
const makeConflictOnClient1 = async (noteId: string, client2Body: string, client1Body: string) => {
	await switchClient(2);
	await Note.save({ id: noteId, body: client2Body });
	await synchronizerStart();

	await switchClient(1);
	await Note.save({ id: noteId, body: client1Body });
	await synchronizerStart();
};

describe('Synchronizer.baseFields', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
	});

	it('should record base_body and base_title after a clean upload', (async () => {
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'My title', body: 'My body', parent_id: folder.id });
		await synchronizerStart();

		const syncItem = await BaseItem.syncItem(syncTargetId(), note.id, { fields: ['base_body', 'base_title', 'base_conflict_note_id'] });
		expect(syncItem.base_title).toBe('My title');
		expect(syncItem.base_body).toBe('My body');
		expect(syncItem.base_conflict_note_id).toBe('');
	}));

	it('should clear base_conflict_note_id when a note is cleanly uploaded again', (async () => {
		const note = await Note.save({ title: 'title', body: 'body' });
		await synchronizerStart();

		// Simulate a previously recorded conflict link
		await Note.setBaseConflictNoteId(syncTargetId(), note.id, 'some-old-conflict-id');

		await Note.save({ id: note.id, body: 'body changed' });
		await synchronizerStart();

		const syncItem = await BaseItem.syncItem(syncTargetId(), note.id, { fields: ['base_body', 'base_conflict_note_id'] });
		expect(syncItem.base_body).toBe('body changed');
		expect(syncItem.base_conflict_note_id).toBe('');
	}));

	it('should link the original note to its conflict note when a conflict is resolved', (async () => {
		const note = await Note.save({ title: 'title', body: 'base body' });
		await synchronizerStart();
		await switchClient(2);
		await synchronizerStart();
		await switchClient(1);

		await makeConflictOnClient1(note.id, 'remote body', 'local body');

		const conflictedNotes = await Note.conflictedNotes();
		expect(conflictedNotes.length).toBe(1);
		const conflictNote = conflictedNotes[0];

		// The link must survive the remote-overwrite step, which rebuilds the sync_items row.
		const syncItem = await BaseItem.syncItem(syncTargetId(), note.id, { fields: ['base_conflict_note_id'] });
		expect(syncItem.base_conflict_note_id).toBe(conflictNote.id);
	}));

	it('should record the base content in conflict_note_states', (async () => {
		const note = await Note.save({ title: 'base title', body: 'base body' });
		await synchronizerStart();
		await switchClient(2);
		await synchronizerStart();
		await switchClient(1);

		await makeConflictOnClient1(note.id, 'remote body', 'local body');

		const conflictNote = (await Note.conflictedNotes())[0];
		const state = await ConflictNoteState.byNoteId(conflictNote.id);

		expect(state.base_body).toBe('base body');
		expect(state.base_title).toBe('base title');
		expect(state.remote_updated_time).toBeGreaterThan(0);
	}));

	it('should delete the conflict state when its conflict note is deleted', (async () => {
		const note = await Note.save({ title: 'base title', body: 'base body' });
		await synchronizerStart();
		await switchClient(2);
		await synchronizerStart();
		await switchClient(1);

		await makeConflictOnClient1(note.id, 'remote body', 'local body');

		const conflictNote = (await Note.conflictedNotes())[0];
		expect(await ConflictNoteState.byNoteId(conflictNote.id)).toBeTruthy();

		await Note.delete(conflictNote.id, { toTrash: false });
		expect(await ConflictNoteState.byNoteId(conflictNote.id)).toBeFalsy();

		// The original note keeps working, it has no state row of its own
		expect(await Note.load(note.id)).toBeTruthy();
	}));

	it('should record the base on download so a receive-only client has an ancestor', (async () => {
		const note = await Note.save({ title: 'My title', body: 'My body' });
		await synchronizerStart();

		// Client 2 only ever receives this note, so without recording on download it
		// would have no base at all
		await switchClient(2);
		await synchronizerStart();

		const syncItem = await BaseItem.syncItem(syncTargetId(), note.id, { fields: ['base_body', 'base_title'] });
		expect(syncItem.base_title).toBe('My title');
		expect(syncItem.base_body).toBe('My body');
	}));

	it('should update the base on download when a note changes remotely', (async () => {
		const note = await Note.save({ title: 'title', body: 'first' });
		await synchronizerStart();
		await switchClient(2);
		await synchronizerStart();

		await switchClient(1);
		await Note.save({ id: note.id, body: 'second' });
		await synchronizerStart();

		await switchClient(2);
		await synchronizerStart();

		const syncItem = await BaseItem.syncItem(syncTargetId(), note.id, { fields: ['base_body'] });
		expect(syncItem.base_body).toBe('second');
	}));

	it('should let a receive-only client auto-merge instead of conflicting', (async () => {
		const note = await Note.save({ title: 'title', body: 'a\nb\nc' });
		await synchronizerStart();
		await switchClient(2);
		await synchronizerStart();

		await switchClient(1);
		await Note.save({ id: note.id, body: 'a1\nb\nc' });
		await synchronizerStart();

		await switchClient(2);
		await synchronizerStart();

		await switchClient(1);
		await Note.save({ id: note.id, body: 'a1\nb\nc2' });
		await synchronizerStart();

		await switchClient(2);
		await Note.save({ id: note.id, body: 'a12\nb\nc' });
		await synchronizerStart();

		expect(await Note.conflictedNotes()).toEqual([]);
		expect((await Note.load(note.id)).body).toBe('a12\nb\nc2');
	}));

	it('should record the base only once an encrypted note has been decrypted', (async () => {
		setEncryptionEnabled(true);
		const masterKey = await loadEncryptionMasterKey();

		const note = await Note.save({ title: 'My title', body: 'My body' });
		await synchronizerStart();

		await switchClient(2);
		await synchronizerStart();

		// The note arrives encrypted, so there is no readable body to record yet
		let syncItem = await BaseItem.syncItem(syncTargetId(), note.id, { fields: ['base_body', 'base_title'] });
		expect(syncItem.base_body).toBe('');
		expect(syncItem.base_title).toBe('');

		Setting.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
		await loadMasterKeysFromSettings(encryptionService());
		await decryptionWorker().start();

		syncItem = await BaseItem.syncItem(syncTargetId(), note.id, { fields: ['base_body', 'base_title'] });
		expect(syncItem.base_title).toBe('My title');
		expect(syncItem.base_body).toBe('My body');
	}));

	it('should not overwrite the base snapshot during a conflict', (async () => {
		const note = await Note.save({ title: 'title', body: 'original base' });
		await synchronizerStart();
		await switchClient(2);
		await synchronizerStart();
		await switchClient(1);

		await makeConflictOnClient1(note.id, 'remote body', 'local body');

		// conflict_note_states keeps the common ancestor, not either side's edit
		const conflictNote = (await Note.conflictedNotes())[0];
		const state = await ConflictNoteState.byNoteId(conflictNote.id);
		expect(state.base_body).toBe('original base');
		expect(state.base_body).not.toBe('remote body');
		expect(state.base_body).not.toBe('local body');

		// The sync item is updated to the version both sides now share,
		// so future conflicts use the latest shared version as the base.
		const syncItem = await BaseItem.syncItem(syncTargetId(), note.id, { fields: ['base_body'] });
		expect(syncItem.base_body).toBe('remote body');
	}));

	it('should not bring back a line both clients deleted', (async () => {
		const note = await Note.save({ title: 'title', body: 'one\ntwo\nthree\nfour' });
		await synchronizerStart();
		await switchClient(2);
		await synchronizerStart();

		// Both delete "two", and one side also edits elsewhere so the merge still runs
		await switchClient(1);
		await Note.save({ id: note.id, body: 'one\nthree\nfour EDITED' });
		await switchClient(2);
		await Note.save({ id: note.id, body: 'one\nthree\nfour' });

		await switchClient(1);
		await synchronizerStart();
		await switchClient(2);
		await synchronizerStart();

		expect((await Note.load(note.id)).body).toBe('one\nthree\nfour EDITED');
	}));

	it('should set the merged result as the base after an auto-merge', (async () => {
		const note = await Note.save({ title: 'title', body: 'line1\nline2\nline3' });
		await synchronizerStart();
		await switchClient(2);
		await synchronizerStart();
		await switchClient(1);

		await makeConflictOnClient1(note.id, 'CHANGED1\nline2\nline3', 'line1\nline2\nCHANGED3');

		const merged = await Note.load(note.id);
		expect(merged.body).toBe('CHANGED1\nline2\nCHANGED3');

		const syncItem = await BaseItem.syncItem(syncTargetId(), note.id, { fields: ['base_body'] });
		expect(syncItem.base_body).toBe(merged.body);
	}));

	it('should clear the base while a conflicting note is still encrypted', (async () => {
		setEncryptionEnabled(true);
		const masterKey = await loadEncryptionMasterKey();

		const note = await Note.save({ title: 'title', body: 'original base' });
		await synchronizerStart();

		// Client 2 has no master key, so it holds the note encrypted
		await switchClient(2);
		await synchronizerStart();

		await switchClient(1);
		await Note.save({ id: note.id, body: 'client 1 edit' });
		await synchronizerStart();

		// The conflict is handled on client 2 while the note is still unreadable
		await switchClient(2);
		await Note.save({ id: note.id, body: 'client 2 edit' });
		await synchronizerStart();

		// Without readable content, the base cannot be written, so it is cleared until
		// the note is decrypted.
		let syncItem = await BaseItem.syncItem(syncTargetId(), note.id, { fields: ['base_body'] });
		expect(syncItem.base_body).toBe('');

		Setting.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
		await loadMasterKeysFromSettings(encryptionService());
		await decryptionWorker().start();

		syncItem = await BaseItem.syncItem(syncTargetId(), note.id, { fields: ['base_body'] });
		expect(syncItem.base_body).toBe((await Note.load(note.id)).body);
	}));

});
