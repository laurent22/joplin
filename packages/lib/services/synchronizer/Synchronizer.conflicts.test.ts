import time from '../../time';
import { allNotesFolders, localNotesFoldersSameAsRemote } from '../../testing/test-utils-synchronizer';
import { synchronizerStart, setupDatabaseAndSynchronizer, sleep, switchClient, syncTargetId, loadEncryptionMasterKey, decryptionWorker } from '../../testing/test-utils';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import BaseItem from '../../models/BaseItem';
import { setEncryptionEnabled } from '../synchronizer/syncInfoUtils';

describe('Synchronizer.conflicts', function() {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
	});

	it('should resolve note conflicts', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();
		let note2 = await Note.load(note1.id);
		note2.title = 'Updated on client 2';
		await Note.save(note2);
		note2 = await Note.load(note2.id);
		await synchronizerStart();

		await switchClient(1);

		let note2conf = await Note.load(note1.id);
		note2conf.title = 'Updated on client 1';
		await Note.save(note2conf);
		note2conf = await Note.load(note1.id);
		await synchronizerStart();
		const conflictedNotes = await Note.conflictedNotes();
		expect(conflictedNotes.length).toBe(1);

		// Other than the id (since the conflicted note is a duplicate), and the is_conflict property
		// the conflicted and original note must be the same in every way, to make sure no data has been lost.
		const conflictedNote = conflictedNotes[0];
		expect(conflictedNote.id === note2conf.id).toBe(false);
		expect(conflictedNote.conflict_original_id).toBe(note2conf.id);
		for (const n in conflictedNote) {
			if (!conflictedNote.hasOwnProperty(n)) continue;
			if (n === 'id' || n === 'is_conflict' || n === 'conflict_original_id') continue;
			expect(conflictedNote[n]).toBe(note2conf[n]);
		}

		const noteUpdatedFromRemote = await Note.load(note1.id);
		for (const n in noteUpdatedFromRemote) {
			if (!noteUpdatedFromRemote.hasOwnProperty(n)) continue;
			expect(noteUpdatedFromRemote[n]).toBe(note2[n]);
		}
	}));

	it('should resolve folders conflicts', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		await Note.save({ title: 'un', parent_id: folder1.id });
		await synchronizerStart();

		await switchClient(2); // ----------------------------------

		await synchronizerStart();

		await sleep(0.1);

		let folder1_modRemote = await Folder.load(folder1.id);
		folder1_modRemote.title = 'folder1 UPDATE CLIENT 2';
		await Folder.save(folder1_modRemote);
		folder1_modRemote = await Folder.load(folder1_modRemote.id);

		await synchronizerStart();

		await switchClient(1); // ----------------------------------

		await sleep(0.1);

		let folder1_modLocal = await Folder.load(folder1.id);
		folder1_modLocal.title = 'folder1 UPDATE CLIENT 1';
		await Folder.save(folder1_modLocal);
		folder1_modLocal = await Folder.load(folder1.id);

		await synchronizerStart();

		const folder1_final = await Folder.load(folder1.id);
		expect(folder1_final.title).toBe(folder1_modRemote.title);
	}));

	it('should resolve conflict if remote folder has been deleted, but note has been added to folder locally', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();
		await Folder.delete(folder1.id);
		await synchronizerStart();

		await switchClient(1);

		await Note.save({ title: 'note1', parent_id: folder1.id });
		await synchronizerStart();
		const items = await allNotesFolders();
		expect(items.length).toBe(1);
		expect(items[0].title).toBe('note1');
		expect(items[0].is_conflict).toBe(1);
	}));

	it('should resolve conflict if note has been deleted remotely and locally', (async () => {
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', parent_id: folder.title });
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();
		await Note.delete(note.id);
		await synchronizerStart();

		await switchClient(1);

		await Note.delete(note.id);
		await synchronizerStart();

		const items = await allNotesFolders();
		expect(items.length).toBe(1);
		expect(items[0].title).toBe('folder');

		await localNotesFoldersSameAsRemote(items, expect);
	}));

	it('should handle conflict when remote note is deleted then local note is modified', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();

		await sleep(0.1);

		await Note.delete(note1.id);

		await synchronizerStart();

		await switchClient(1);

		const newTitle = 'Modified after having been deleted';
		await Note.save({ id: note1.id, title: newTitle });

		await synchronizerStart();

		const conflictedNotes = await Note.conflictedNotes();

		expect(conflictedNotes.length).toBe(1);
		expect(conflictedNotes[0].title).toBe(newTitle);

		const unconflictedNotes = await Note.unconflictedNotes();

		expect(unconflictedNotes.length).toBe(0);
	}));

	it('should handle conflict when remote folder is deleted then local folder is renamed', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		await Folder.save({ title: 'folder2' });
		await Note.save({ title: 'un', parent_id: folder1.id });
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();

		await sleep(0.1);

		await Folder.delete(folder1.id);

		await synchronizerStart();

		await switchClient(1);

		await sleep(0.1);

		const newTitle = 'Modified after having been deleted';
		await Folder.save({ id: folder1.id, title: newTitle });

		await synchronizerStart();

		const items = await allNotesFolders();

		expect(items.length).toBe(1);
	}));

	it('should not sync notes with conflicts', (async () => {
		const f1 = await Folder.save({ title: 'folder' });
		await Note.save({ title: 'mynote', parent_id: f1.id, is_conflict: 1 });
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();
		const notes = await Note.all();
		const folders = await Folder.all();
		expect(notes.length).toBe(0);
		expect(folders.length).toBe(1);
	}));

	it('should not try to delete on remote conflicted notes that have been deleted', (async () => {
		const f1 = await Folder.save({ title: 'folder' });
		const n1 = await Note.save({ title: 'mynote', parent_id: f1.id });
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();
		await Note.save({ id: n1.id, is_conflict: 1 });
		await Note.delete(n1.id);
		const deletedItems = await BaseItem.deletedItems(syncTargetId());

		expect(deletedItems.length).toBe(0);
	}));

	async function ignorableNoteConflictTest(withEncryption: boolean) {
		if (withEncryption) {
			setEncryptionEnabled(true);
			await loadEncryptionMasterKey();
		}

		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'un', is_todo: 1, parent_id: folder1.id });
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();
		if (withEncryption) {
			await loadEncryptionMasterKey(null, true);
			await decryptionWorker().start();
		}
		let note2 = await Note.load(note1.id);
		note2.todo_completed = time.unixMs() - 1;
		await Note.save(note2);
		note2 = await Note.load(note2.id);
		await synchronizerStart();

		await switchClient(1);

		let note2conf = await Note.load(note1.id);
		note2conf.todo_completed = time.unixMs();
		await Note.save(note2conf);
		note2conf = await Note.load(note1.id);
		await synchronizerStart();

		if (!withEncryption) {
			// That was previously a common conflict:
			// - Client 1 mark todo as "done", and sync
			// - Client 2 doesn't sync, mark todo as "done" todo. Then sync.
			// In theory it is a conflict because the todo_completed dates are different
			// but in practice it doesn't matter, we can just take the date when the
			// todo was marked as "done" the first time.

			const conflictedNotes = await Note.conflictedNotes();
			expect(conflictedNotes.length).toBe(0);

			const notes = await Note.all();
			expect(notes.length).toBe(1);
			expect(notes[0].id).toBe(note1.id);
			expect(notes[0].todo_completed).toBe(note2.todo_completed);
		} else {
			// If the notes are encrypted however it's not possible to do this kind of
			// smart conflict resolving since we don't know the content, so in that
			// case it's handled as a regular conflict.

			const conflictedNotes = await Note.conflictedNotes();
			expect(conflictedNotes.length).toBe(1);

			const notes = await Note.all();
			expect(notes.length).toBe(2);
		}
	}

	it('should not consider it is a conflict if neither the title nor body of the note have changed', (async () => {
		await ignorableNoteConflictTest(false);
	}));

	it('should always handle conflict if local or remote are encrypted', (async () => {
		await ignorableNoteConflictTest(true);
	}));

});
