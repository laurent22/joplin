import Setting from '../../models/Setting';
import { allNotesFolders, remoteNotesAndFolders, localNotesFoldersSameAsRemote } from '../../testing/test-utils-synchronizer';
import { syncTargetName, afterAllCleanUp, synchronizerStart, setupDatabaseAndSynchronizer, synchronizer, sleep, switchClient, syncTargetId, fileApi } from '../../testing/test-utils';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import BaseItem from '../../models/BaseItem';
const WelcomeUtils = require('../../WelcomeUtils');

describe('Synchronizer.basics', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
	});

	afterAll(async () => {
		await afterAllCleanUp();
	});

	it('should create remote items', (async () => {
		const folder = await Folder.save({ title: 'folder1' });
		await Note.save({ title: 'un', parent_id: folder.id });

		const all = await allNotesFolders();

		await synchronizerStart();

		await localNotesFoldersSameAsRemote(all, expect);
	}));

	it('should update remote items', (async () => {
		const folder = await Folder.save({ title: 'folder1' });
		const note = await Note.save({ title: 'un', parent_id: folder.id });
		await synchronizerStart();

		await Note.save({ title: 'un UPDATE', id: note.id });

		const all = await allNotesFolders();
		await synchronizerStart();

		await localNotesFoldersSameAsRemote(all, expect);
	}));

	it('should create local items', (async () => {
		const folder = await Folder.save({ title: 'folder1' });
		await Note.save({ title: 'un', parent_id: folder.id });
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();

		const all = await allNotesFolders();

		await localNotesFoldersSameAsRemote(all, expect);
	}));

	it('should update local items', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();

		await sleep(0.1);

		let note2 = await Note.load(note1.id);
		note2.title = 'Updated on client 2';
		await Note.save(note2);
		note2 = await Note.load(note2.id);

		await synchronizerStart();

		await switchClient(1);

		await synchronizerStart();

		const all = await allNotesFolders();

		await localNotesFoldersSameAsRemote(all, expect);
	}));

	it('should delete remote notes', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();

		await sleep(0.1);

		await Note.delete(note1.id);

		await synchronizerStart();

		const remotes = await remoteNotesAndFolders();
		expect(remotes.length).toBe(1);
		expect(remotes[0].id).toBe(folder1.id);

		const deletedItems = await BaseItem.deletedItems(syncTargetId());
		expect(deletedItems.length).toBe(0);
	}));

	it('should not created deleted_items entries for items deleted via sync', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		await Note.save({ title: 'un', parent_id: folder1.id });
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();
		await Folder.delete(folder1.id);
		await synchronizerStart();

		await switchClient(1);

		await synchronizerStart();
		const deletedItems = await BaseItem.deletedItems(syncTargetId());
		expect(deletedItems.length).toBe(0);
	}));

	it('should delete local notes', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'deux', parent_id: folder1.id });
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();
		await Note.delete(note1.id);
		await synchronizerStart();

		await switchClient(1);

		await synchronizerStart();
		const items = await allNotesFolders();
		expect(items.length).toBe(2);
		const deletedItems = await BaseItem.deletedItems(syncTargetId());
		expect(deletedItems.length).toBe(0);
		await Note.delete(note2.id);
		await synchronizerStart();
	}));

	it('should delete remote folder', (async () => {
		await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();

		await sleep(0.1);

		await Folder.delete(folder2.id);

		await synchronizerStart();

		const all = await allNotesFolders();
		await localNotesFoldersSameAsRemote(all, expect);
	}));

	it('should delete local folder', (async () => {
		await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();
		await Folder.delete(folder2.id);
		await synchronizerStart();

		await switchClient(1);

		await synchronizerStart();
		const items = await allNotesFolders();
		await localNotesFoldersSameAsRemote(items, expect);
	}));

	it('should cross delete all folders', (async () => {
		// If client1 and 2 have two folders, client 1 deletes item 1 and client
		// 2 deletes item 2, they should both end up with no items after sync.

		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();
		await sleep(0.1);
		await Folder.delete(folder1.id);

		await switchClient(1);

		await Folder.delete(folder2.id);
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();
		const items2 = await allNotesFolders();

		await switchClient(1);

		await synchronizerStart();
		const items1 = await allNotesFolders();
		expect(items1.length).toBe(0);
		expect(items1.length).toBe(items2.length);
	}));

	it('items should be downloaded again when user cancels in the middle of delta operation', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		await Note.save({ title: 'un', is_todo: 1, parent_id: folder1.id });
		await synchronizerStart();

		await switchClient(2);

		synchronizer().testingHooks_ = ['cancelDeltaLoop2'];
		await synchronizerStart();
		let notes = await Note.all();
		expect(notes.length).toBe(0);

		synchronizer().testingHooks_ = [];
		await synchronizerStart();
		notes = await Note.all();
		expect(notes.length).toBe(1);
	}));

	it('should skip items that cannot be synced', (async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'un', is_todo: 1, parent_id: folder1.id });
		const noteId = note1.id;
		await synchronizerStart();
		let disabledItems = await BaseItem.syncDisabledItems(syncTargetId());
		expect(disabledItems.length).toBe(0);
		await Note.save({ id: noteId, title: 'un mod' });
		synchronizer().testingHooks_ = ['notesRejectedByTarget'];
		await synchronizerStart();
		synchronizer().testingHooks_ = [];
		await synchronizerStart(); // Another sync to check that this item is now excluded from sync

		await switchClient(2);

		await synchronizerStart();
		const notes = await Note.all();
		expect(notes.length).toBe(1);
		expect(notes[0].title).toBe('un');

		await switchClient(1);

		disabledItems = await BaseItem.syncDisabledItems(syncTargetId());
		expect(disabledItems.length).toBe(1);
	}));

	it('should allow duplicate folder titles', (async () => {
		await Folder.save({ title: 'folder' });

		await switchClient(2);

		let remoteF2 = await Folder.save({ title: 'folder' });
		await synchronizerStart();

		await switchClient(1);

		await sleep(0.1);

		await synchronizerStart();

		const localF2 = await Folder.load(remoteF2.id);

		expect(localF2.title === remoteF2.title).toBe(true);

		// Then that folder that has been renamed locally should be set in such a way
		// that synchronizing it applies the title change remotely, and that new title
		// should be retrieved by client 2.

		await synchronizerStart();

		await switchClient(2);
		await sleep(0.1);

		await synchronizerStart();

		remoteF2 = await Folder.load(remoteF2.id);

		expect(remoteF2.title === localF2.title).toBe(true);
	}));

	it('should create remote items with UTF-8 content', (async () => {
		const folder = await Folder.save({ title: 'Fahrräder' });
		await Note.save({ title: 'Fahrräder', body: 'Fahrräder', parent_id: folder.id });
		const all = await allNotesFolders();

		await synchronizerStart();

		await localNotesFoldersSameAsRemote(all, expect);
	}));

	it('should update remote items but not pull remote changes', (async () => {
		const folder = await Folder.save({ title: 'folder1' });
		const note = await Note.save({ title: 'un', parent_id: folder.id });
		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();
		await Note.save({ title: 'deux', parent_id: folder.id });
		await synchronizerStart();

		await switchClient(1);

		await Note.save({ title: 'un UPDATE', id: note.id });
		await synchronizerStart(null, { syncSteps: ['update_remote'] });
		const all = await allNotesFolders();
		expect(all.length).toBe(2);

		await switchClient(2);

		await synchronizerStart();
		const note2 = await Note.load(note.id);
		expect(note2.title).toBe('un UPDATE');
	}));

	it('should create a new Welcome notebook on each client', (async () => {
		// Create the Welcome items on two separate clients

		await WelcomeUtils.createWelcomeItems();
		await synchronizerStart();

		await switchClient(2);

		await WelcomeUtils.createWelcomeItems();
		const beforeFolderCount = (await Folder.all()).length;
		const beforeNoteCount = (await Note.all()).length;
		expect(beforeFolderCount === 1).toBe(true);
		expect(beforeNoteCount > 1).toBe(true);

		await synchronizerStart();

		const afterFolderCount = (await Folder.all()).length;
		const afterNoteCount = (await Note.all()).length;

		expect(afterFolderCount).toBe(beforeFolderCount * 2);
		expect(afterNoteCount).toBe(beforeNoteCount * 2);

		// Changes to the Welcome items should be synced to all clients

		const f1 = (await Folder.all())[0];
		await Folder.save({ id: f1.id, title: 'Welcome MOD' });

		await synchronizerStart();

		await switchClient(1);

		await synchronizerStart();

		const f1_1 = await Folder.load(f1.id);
		expect(f1_1.title).toBe('Welcome MOD');
	}));

	it('should not wipe out user data when syncing with an empty target', (async () => {
		// Only these targets support the wipeOutFailSafe flag (in other words, the targets that use basicDelta)
		if (!['nextcloud', 'memory', 'filesystem', 'amazon_s3'].includes(syncTargetName())) return;

		for (let i = 0; i < 10; i++) await Note.save({ title: 'note' });

		Setting.setValue('sync.wipeOutFailSafe', true);
		await synchronizerStart();
		await fileApi().clearRoot(); // oops
		await synchronizerStart();
		expect((await Note.all()).length).toBe(10); // but since the fail-safe if on, the notes have not been deleted

		Setting.setValue('sync.wipeOutFailSafe', false); // Now switch it off
		await synchronizerStart();
		expect((await Note.all()).length).toBe(0); // Since the fail-safe was off, the data has been cleared

		// Handle case where the sync target has been wiped out, then the user creates one note and sync.

		for (let i = 0; i < 10; i++) await Note.save({ title: 'note' });
		Setting.setValue('sync.wipeOutFailSafe', true);
		await synchronizerStart();
		await fileApi().clearRoot();
		await Note.save({ title: 'ma note encore' });
		await synchronizerStart();
		expect((await Note.all()).length).toBe(11);
	}));

	it('should not sync deletions that came via sync even when there is a conflict', (async () => {
		// This test is mainly to simulate sharing, unsharing and sharing a note
		// again. Previously, when doing so, the app would create deleted_items
		// objects on the recipient when the owner unshares. It means that when
		// sharing again, the recipient would apply the deletions and delete
		// everything in the shared notebook.
		//
		// Specifically it was happening when a conflict was generated as a
		// result of the items being deleted.
		//
		// - C1 creates a note and sync
		// - C2 sync and get the note
		// - C2 deletes the note and sync
		// - C1 modify the note, and sync
		//
		// => A conflict is created. The note is deleted and a copy is created
		// in the Conflict folder.
		//
		// After this, we recreate the note on the sync target (simulates the
		// note being shared again), and we check that C2 doesn't attempt to
		// delete that note.

		const note = await Note.save({});
		await synchronizerStart();
		const noteSerialized = await fileApi().get(`${note.id}.md`);

		await switchClient(2);

		await synchronizerStart();
		await Note.delete(note.id);
		await synchronizerStart();

		await switchClient(1);

		await Note.save({ id: note.id });
		await synchronizerStart();
		expect((await Note.all())[0].is_conflict).toBe(1);
		await fileApi().put(`${note.id}.md`, noteSerialized); // Recreate the note - simulate sharing again.
		await synchronizerStart();

		// Check that the client didn't delete the note
		const remotes = (await fileApi().list()).items;
		expect(remotes.find(r => r.path === `${note.id}.md`)).toBeTruthy();
	}));

});
