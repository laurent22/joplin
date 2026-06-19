import { synchronizerStart, setupDatabaseAndSynchronizer, switchClient, syncTargetId } from '../../testing/test-utils';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import BaseItem from '../../models/BaseItem';
import ConflictNoteState from '../../models/ConflictNoteState';

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

	it('should record base and remote content in conflict_note_states', (async () => {
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
		expect(state.remote_body).toBe('remote body');
		expect(state.remote_updated_time).toBeGreaterThan(0);
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
	}));

});
