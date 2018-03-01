require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, encryptionService, loadEncryptionMasterKey, fileContentEqual, decryptionWorker, checkThrowAsync, asyncTest } = require('test-utils.js');
const { shim } = require('lib/shim.js');
const fs = require('fs-extra');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const Resource = require('lib/models/Resource.js');
const Tag = require('lib/models/Tag.js');
const { Database } = require('lib/database.js');
const Setting = require('lib/models/Setting.js');
const MasterKey = require('lib/models/MasterKey');
const BaseItem = require('lib/models/BaseItem.js');
const BaseModel = require('lib/BaseModel.js');
const SyncTargetRegistry = require('lib/SyncTargetRegistry.js');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000 + 30000; // The first test is slow because the database needs to be built

async function allItems() {
	let folders = await Folder.all();
	let notes = await Note.all();
	return folders.concat(notes);
}

async function allSyncTargetItemsEncrypted() {
	const list = await fileApi().list();
	const files = list.items;

	//console.info(Setting.value('resourceDir'));

	let totalCount = 0;
	let encryptedCount = 0;
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		const remoteContentString = await fileApi().get(file.path);
		const remoteContent = await BaseItem.unserialize(remoteContentString);
		const ItemClass = BaseItem.itemClass(remoteContent);

		if (!ItemClass.encryptionSupported()) continue;

		totalCount++;

		if (remoteContent.type_ === BaseModel.TYPE_RESOURCE) {
			const content = await fileApi().get('.resource/' + remoteContent.id);
			totalCount++;
			if (content.substr(0, 5) === 'JED01') output = encryptedCount++;
		}

		if (!!remoteContent.encryption_applied) encryptedCount++;
	}

	if (!totalCount) throw new Error('No encryptable item on sync target');

	return totalCount === encryptedCount;
}

async function localItemsSameAsRemote(locals, expect) {
	let error = null;
	try {
		let files = await fileApi().list();
		files = files.items;

		expect(locals.length).toBe(files.length);

		for (let i = 0; i < locals.length; i++) {
			let dbItem = locals[i];
			let path = BaseItem.systemPath(dbItem);
			let remote = await fileApi().stat(path);

			expect(!!remote).toBe(true);
			if (!remote) continue;

			// if (syncTargetId() == SyncTargetRegistry.nameToId('filesystem')) {
			// 	expect(remote.updated_time).toBe(Math.floor(dbItem.updated_time / 1000) * 1000);
			// } else {
			// 	expect(remote.updated_time).toBe(dbItem.updated_time);
			// }

			let remoteContent = await fileApi().get(path);

			remoteContent = dbItem.type_ == BaseModel.TYPE_NOTE ? await Note.unserialize(remoteContent) : await Folder.unserialize(remoteContent);
			expect(remoteContent.title).toBe(dbItem.title);
		}
	} catch (e) {
		error = e;
	}

	expect(error).toBe(null);
}

let insideBeforeEach = false;

describe('Synchronizer', function() {

	beforeEach(async (done) => {
		insideBeforeEach = true;

		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
		done();

		insideBeforeEach = false;
	});

	it('should create remote items', asyncTest(async () => {
		let folder = await Folder.save({ title: "folder1" });
		await Note.save({ title: "un", parent_id: folder.id });

		let all = await allItems();

		await synchronizer().start();

		await localItemsSameAsRemote(all, expect);
	}));

	it('should update remote item', asyncTest(async () => {
		let folder = await Folder.save({ title: "folder1" });
		let note = await Note.save({ title: "un", parent_id: folder.id });
		await synchronizer().start();

		await Note.save({ title: "un UPDATE", id: note.id });

		let all = await allItems();
		await synchronizer().start();

		await localItemsSameAsRemote(all, expect);
	}));

	it('should create local items', asyncTest(async () => {
		let folder = await Folder.save({ title: "folder1" });
		await Note.save({ title: "un", parent_id: folder.id });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();

		let all = await allItems();

		await localItemsSameAsRemote(all, expect);
	}));

	it('should update local items', asyncTest(async () => {
		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: "un", parent_id: folder1.id });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();

		await sleep(0.1);

		let note2 = await Note.load(note1.id);
		note2.title = "Updated on client 2";
		await Note.save(note2);
		note2 = await Note.load(note2.id);

		await synchronizer().start();

		await switchClient(1);

		await synchronizer().start();

		let all = await allItems();

		await localItemsSameAsRemote(all, expect);
	}));

	it('should resolve note conflicts', asyncTest(async () => {
		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: "un", parent_id: folder1.id });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		let note2 = await Note.load(note1.id);
		note2.title = "Updated on client 2";
		await Note.save(note2);
		note2 = await Note.load(note2.id);
		await synchronizer().start();

		await switchClient(1);

		let note2conf = await Note.load(note1.id);
		note2conf.title = "Updated on client 1";
		await Note.save(note2conf);
		note2conf = await Note.load(note1.id);
		await synchronizer().start();
		let conflictedNotes = await Note.conflictedNotes();
		expect(conflictedNotes.length).toBe(1);

		// Other than the id (since the conflicted note is a duplicate), and the is_conflict property
		// the conflicted and original note must be the same in every way, to make sure no data has been lost.
		let conflictedNote = conflictedNotes[0];
		expect(conflictedNote.id == note2conf.id).toBe(false);
		for (let n in conflictedNote) {
			if (!conflictedNote.hasOwnProperty(n)) continue;
			if (n == 'id' || n == 'is_conflict') continue;
			expect(conflictedNote[n]).toBe(note2conf[n], 'Property: ' + n);
		}

		let noteUpdatedFromRemote = await Note.load(note1.id);
		for (let n in noteUpdatedFromRemote) {
			if (!noteUpdatedFromRemote.hasOwnProperty(n)) continue;
			expect(noteUpdatedFromRemote[n]).toBe(note2[n], 'Property: ' + n);
		}
	}));

	it('should resolve folders conflicts', asyncTest(async () => {
		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: "un", parent_id: folder1.id });
		await synchronizer().start();

		await switchClient(2); // ----------------------------------

		await synchronizer().start();

		await sleep(0.1);

		let folder1_modRemote = await Folder.load(folder1.id);
		folder1_modRemote.title = "folder1 UPDATE CLIENT 2";
		await Folder.save(folder1_modRemote);
		folder1_modRemote = await Folder.load(folder1_modRemote.id);

		await synchronizer().start();

		await switchClient(1); // ----------------------------------

		await sleep(0.1);

		let folder1_modLocal = await Folder.load(folder1.id);
		folder1_modLocal.title = "folder1 UPDATE CLIENT 1";
		await Folder.save(folder1_modLocal);
		folder1_modLocal = await Folder.load(folder1.id);

		await synchronizer().start();

		let folder1_final = await Folder.load(folder1.id);
		expect(folder1_final.title).toBe(folder1_modRemote.title);
	}));

	it('should delete remote notes', asyncTest(async () => {
		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: "un", parent_id: folder1.id });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();

		await sleep(0.1);

		await Note.delete(note1.id);

		await synchronizer().start();

		let files = await fileApi().list();
		files = files.items;

		expect(files.length).toBe(1);
		expect(files[0].path).toBe(Folder.systemPath(folder1));

		let deletedItems = await BaseItem.deletedItems(syncTargetId());
		expect(deletedItems.length).toBe(0);
	}));

	it('should not created deleted_items entries for items deleted via sync', asyncTest(async () => {
		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: "un", parent_id: folder1.id });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		await Folder.delete(folder1.id);
		await synchronizer().start();

		await switchClient(1);

		await synchronizer().start();
		let deletedItems = await BaseItem.deletedItems(syncTargetId());
		expect(deletedItems.length).toBe(0);
	}));

	it('should delete local notes', asyncTest(async () => {
		// For these tests we pass the context around for each user. This is to make sure that the "deletedItemsProcessed"
		// property of the basicDelta() function is cleared properly at the end of a sync operation. If it is not cleared
		// it means items will no longer be deleted locally via sync.

		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: "un", parent_id: folder1.id });
		let note2 = await Note.save({ title: "deux", parent_id: folder1.id });
		let context1 = await synchronizer().start();

		await switchClient(2);

		let context2 = await synchronizer().start();
		await Note.delete(note1.id);
		context2 = await synchronizer().start({ context: context2 });

		await switchClient(1);

		context1 = await synchronizer().start({ context: context1 });
		let items = await allItems();
		expect(items.length).toBe(2);
		let deletedItems = await BaseItem.deletedItems(syncTargetId());
		expect(deletedItems.length).toBe(0);
		await Note.delete(note2.id);
		context1 = await synchronizer().start({ context: context1 });
	}));

	it('should delete remote folder', asyncTest(async () => {
		let folder1 = await Folder.save({ title: "folder1" });
		let folder2 = await Folder.save({ title: "folder2" });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();

		await sleep(0.1);

		await Folder.delete(folder2.id);

		await synchronizer().start();

		let all = await allItems();
		await localItemsSameAsRemote(all, expect);
	}));

	it('should delete local folder', asyncTest(async () => {
		let folder1 = await Folder.save({ title: "folder1" });
		let folder2 = await Folder.save({ title: "folder2" });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();

		await sleep(0.1);

		await Folder.delete(folder2.id);

		await synchronizer().start();

		await switchClient(1);

		await synchronizer().start();

		let items = await allItems();
		await localItemsSameAsRemote(items, expect);
	}));

	it('should resolve conflict if remote folder has been deleted, but note has been added to folder locally', asyncTest(async () => {
		let folder1 = await Folder.save({ title: "folder1" });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		await Folder.delete(folder1.id);
		await synchronizer().start();

		await switchClient(1);

		let note = await Note.save({ title: "note1", parent_id: folder1.id });
		await synchronizer().start();
		let items = await allItems();		
		expect(items.length).toBe(1);
		expect(items[0].title).toBe('note1');
		expect(items[0].is_conflict).toBe(1);
			}));

	it('should resolve conflict if note has been deleted remotely and locally', asyncTest(async () => {
		let folder = await Folder.save({ title: "folder" });
		let note = await Note.save({ title: "note", parent_id: folder.title });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		await Note.delete(note.id);
		await synchronizer().start();

		await switchClient(1);

		await Note.delete(note.id);
		await synchronizer().start();

		let items = await allItems();
		expect(items.length).toBe(1);
		expect(items[0].title).toBe('folder');

		await localItemsSameAsRemote(items, expect);
	}));

	it('should cross delete all folders', asyncTest(async () => {
		// If client1 and 2 have two folders, client 1 deletes item 1 and client
		// 2 deletes item 2, they should both end up with no items after sync.

		let folder1 = await Folder.save({ title: "folder1" });
		let folder2 = await Folder.save({ title: "folder2" });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();

		await sleep(0.1);

		await Folder.delete(folder1.id);

		await switchClient(1);

		await Folder.delete(folder2.id);

		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();

		let items2 = await allItems();

		await switchClient(1);

		await synchronizer().start();

		let items1 = await allItems();

		expect(items1.length).toBe(0);
		expect(items1.length).toBe(items2.length);
			}));

	it('should handle conflict when remote note is deleted then local note is modified', asyncTest(async () => {
		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: "un", parent_id: folder1.id });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();

		await sleep(0.1);

		await Note.delete(note1.id);

		await synchronizer().start();

		await switchClient(1);

		let newTitle = 'Modified after having been deleted';
		await Note.save({ id: note1.id, title: newTitle });

		await synchronizer().start();

		let conflictedNotes = await Note.conflictedNotes();

		expect(conflictedNotes.length).toBe(1);
		expect(conflictedNotes[0].title).toBe(newTitle);

		let unconflictedNotes = await Note.unconflictedNotes();

		expect(unconflictedNotes.length).toBe(0);
	}));

	it('should handle conflict when remote folder is deleted then local folder is renamed', asyncTest(async () => {
		let folder1 = await Folder.save({ title: "folder1" });
		let folder2 = await Folder.save({ title: "folder2" });
		let note1 = await Note.save({ title: "un", parent_id: folder1.id });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();

		await sleep(0.1);

		await Folder.delete(folder1.id);

		await synchronizer().start();

		await switchClient(1);

		await sleep(0.1);

		let newTitle = 'Modified after having been deleted';
		await Folder.save({ id: folder1.id, title: newTitle });

		await synchronizer().start();

		let items = await allItems();

		expect(items.length).toBe(1);
	}));

	it('should allow duplicate folder titles', asyncTest(async () => {
		let localF1 = await Folder.save({ title: "folder" });

		await switchClient(2);

		let remoteF2 = await Folder.save({ title: "folder" });
		await synchronizer().start();

		await switchClient(1);

		await sleep(0.1);

		await synchronizer().start();

		let localF2 = await Folder.load(remoteF2.id);

		expect(localF2.title == remoteF2.title).toBe(true);

		// Then that folder that has been renamed locally should be set in such a way
		// that synchronizing it applies the title change remotely, and that new title
		// should be retrieved by client 2.

		await synchronizer().start();

		await switchClient(2);
		await sleep(0.1);

		await synchronizer().start();

		remoteF2 = await Folder.load(remoteF2.id);

		expect(remoteF2.title == localF2.title).toBe(true);
	}));

	async function shoudSyncTagTest(withEncryption) {
		let masterKey = null;
		if (withEncryption) {
			Setting.setValue('encryption.enabled', true);
			masterKey = await loadEncryptionMasterKey();
		}

		let f1 = await Folder.save({ title: "folder" });
		let n1 = await Note.save({ title: "mynote" });
		let n2 = await Note.save({ title: "mynote2" });
		let tag = await Tag.save({ title: 'mytag' });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		if (withEncryption) {
			const masterKey_2 = await MasterKey.load(masterKey.id);
			await encryptionService().loadMasterKey(masterKey_2, '123456', true);
			let t = await Tag.load(tag.id);
			await Tag.decrypt(t);
		}
		let remoteTag = await Tag.loadByTitle(tag.title);
		expect(!!remoteTag).toBe(true);
		expect(remoteTag.id).toBe(tag.id);
		await Tag.addNote(remoteTag.id, n1.id);
		await Tag.addNote(remoteTag.id, n2.id);
		let noteIds = await Tag.noteIds(tag.id);
		expect(noteIds.length).toBe(2);
		await synchronizer().start();

		await switchClient(1);

		await synchronizer().start();
		let remoteNoteIds = await Tag.noteIds(tag.id);
		expect(remoteNoteIds.length).toBe(2);
		await Tag.removeNote(tag.id, n1.id);
		remoteNoteIds = await Tag.noteIds(tag.id);
		expect(remoteNoteIds.length).toBe(1);
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		noteIds = await Tag.noteIds(tag.id);
		expect(noteIds.length).toBe(1);
		expect(remoteNoteIds[0]).toBe(noteIds[0]);
	}

	it('should sync tags', asyncTest(async () => {
		await shoudSyncTagTest(false);
	}));

	it('should sync encrypted tags', asyncTest(async () => {
		await shoudSyncTagTest(true);
	}));

	it('should not sync notes with conflicts', asyncTest(async () => {
		let f1 = await Folder.save({ title: "folder" });
		let n1 = await Note.save({ title: "mynote", parent_id: f1.id, is_conflict: 1 });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		let notes = await Note.all();
		let folders = await Folder.all()
		expect(notes.length).toBe(0);
		expect(folders.length).toBe(1);
	}));

	it('should not try to delete on remote conflicted notes that have been deleted', asyncTest(async () => {
		let f1 = await Folder.save({ title: "folder" });
		let n1 = await Note.save({ title: "mynote", parent_id: f1.id });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		await Note.save({ id: n1.id, is_conflict: 1 });
		await Note.delete(n1.id);
		const deletedItems = await BaseItem.deletedItems(syncTargetId());

		expect(deletedItems.length).toBe(0);
	}));
	
	async function ignorableNoteConflictTest(withEncryption) {
		if (withEncryption) {
			Setting.setValue('encryption.enabled', true);
			await loadEncryptionMasterKey();
		}

		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: "un", is_todo: 1, parent_id: folder1.id });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		if (withEncryption) {
			await loadEncryptionMasterKey(null, true);
			await decryptionWorker().start();
		}
		let note2 = await Note.load(note1.id);
		note2.todo_completed = time.unixMs()-1;
		await Note.save(note2);
		note2 = await Note.load(note2.id);
		await synchronizer().start();

		await switchClient(1);

		let note2conf = await Note.load(note1.id);
		note2conf.todo_completed = time.unixMs();
		await Note.save(note2conf);
		note2conf = await Note.load(note1.id);
		await synchronizer().start();

		if (!withEncryption) {
			// That was previously a common conflict:
			// - Client 1 mark todo as "done", and sync
			// - Client 2 doesn't sync, mark todo as "done" todo. Then sync.
			// In theory it is a conflict because the todo_completed dates are different
			// but in practice it doesn't matter, we can just take the date when the
			// todo was marked as "done" the first time.

			let conflictedNotes = await Note.conflictedNotes();
			expect(conflictedNotes.length).toBe(0);

			let notes = await Note.all();
			expect(notes.length).toBe(1);
			expect(notes[0].id).toBe(note1.id);
			expect(notes[0].todo_completed).toBe(note2.todo_completed);		
		} else {
			// If the notes are encrypted however it's not possible to do this kind of
			// smart conflict resolving since we don't know the content, so in that
			// case it's handled as a regular conflict.

			let conflictedNotes = await Note.conflictedNotes();
			expect(conflictedNotes.length).toBe(1);

			let notes = await Note.all();
			expect(notes.length).toBe(2);
		}
	}

	it('should not consider it is a conflict if neither the title nor body of the note have changed', asyncTest(async () => {
		await ignorableNoteConflictTest(false);
	}));

	it('should always handle conflict if local or remote are encrypted', asyncTest(async () => {
		await ignorableNoteConflictTest(true);
	}));

	it('items should be downloaded again when user cancels in the middle of delta operation', asyncTest(async () => {
		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: "un", is_todo: 1, parent_id: folder1.id });
		await synchronizer().start();

		await switchClient(2);

		synchronizer().testingHooks_ = ['cancelDeltaLoop2'];		
		let context = await synchronizer().start();
		let notes = await Note.all();
		expect(notes.length).toBe(0);

		synchronizer().testingHooks_ = [];
		await synchronizer().start({ context: context });
		notes = await Note.all();
		expect(notes.length).toBe(1);
	}));

	it('should skip items that cannot be synced', asyncTest(async () => {
		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: "un", is_todo: 1, parent_id: folder1.id });
		const noteId = note1.id;
		await synchronizer().start();
		let disabledItems = await BaseItem.syncDisabledItems(syncTargetId());
		expect(disabledItems.length).toBe(0);
		await Note.save({ id: noteId, title: "un mod", });
		synchronizer().testingHooks_ = ['rejectedByTarget'];
		await synchronizer().start();
		synchronizer().testingHooks_ = [];
		await synchronizer().start(); // Another sync to check that this item is now excluded from sync

		await switchClient(2);

		await synchronizer().start();
		let notes = await Note.all();
		expect(notes.length).toBe(1);
		expect(notes[0].title).toBe('un');

		await switchClient(1);

		disabledItems = await BaseItem.syncDisabledItems(syncTargetId());
		expect(disabledItems.length).toBe(1);
	}));

	it('notes and folders should get encrypted when encryption is enabled', asyncTest(async () => {
		Setting.setValue('encryption.enabled', true);
		const masterKey = await loadEncryptionMasterKey();
		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: "un", body: 'to be encrypted', parent_id: folder1.id });
		await synchronizer().start();
		// After synchronisation, remote items should be encrypted but local ones remain plain text
		note1 = await Note.load(note1.id);
		expect(note1.title).toBe('un');

		await switchClient(2);

		await synchronizer().start();
		let folder1_2 = await Folder.load(folder1.id);
		let note1_2 = await Note.load(note1.id);
		let masterKey_2 = await MasterKey.load(masterKey.id);
		// On this side however it should be received encrypted
		expect(!note1_2.title).toBe(true);
		expect(!folder1_2.title).toBe(true);
		expect(!!note1_2.encryption_cipher_text).toBe(true);
		expect(!!folder1_2.encryption_cipher_text).toBe(true);
		// Master key is already encrypted so it does not get re-encrypted during sync
		expect(masterKey_2.content).toBe(masterKey.content);
		expect(masterKey_2.checksum).toBe(masterKey.checksum);
		// Now load the master key we got from client 1 and try to decrypt
		await encryptionService().loadMasterKey(masterKey_2, '123456', true);
		// Get the decrypted items back
		await Folder.decrypt(folder1_2);
		await Note.decrypt(note1_2);
		folder1_2 = await Folder.load(folder1.id);
		note1_2 = await Note.load(note1.id);
		// Check that properties match the original items. Also check
		// the encryption did not affect the updated_time timestamp.
		expect(note1_2.title).toBe(note1.title);
		expect(note1_2.body).toBe(note1.body);
		expect(note1_2.updated_time).toBe(note1.updated_time);
		expect(!note1_2.encryption_cipher_text).toBe(true);
		expect(folder1_2.title).toBe(folder1.title);
		expect(folder1_2.updated_time).toBe(folder1.updated_time);
		expect(!folder1_2.encryption_cipher_text).toBe(true);
	}));

	it('should enable encryption automatically when downloading new master key (and none was previously available)',asyncTest(async () => {
		// Enable encryption on client 1 and sync an item
		Setting.setValue('encryption.enabled', true);
		await loadEncryptionMasterKey();
		let folder1 = await Folder.save({ title: "folder1" });
		await synchronizer().start();

		await switchClient(2);

		// Synchronising should enable encryption since we're going to get a master key
		expect(Setting.value('encryption.enabled')).toBe(false);
		await synchronizer().start();
		expect(Setting.value('encryption.enabled')).toBe(true);

		// Check that we got the master key from client 1
		const masterKey = (await MasterKey.all())[0];
		expect(!!masterKey).toBe(true);

		// Since client 2 hasn't supplied a password yet, no master key is currently loaded
		expect(encryptionService().loadedMasterKeyIds().length).toBe(0);

		// If we sync now, nothing should be sent to target since we don't have a password.
		// Technically it's incorrect to set the property of an encrypted variable but it allows confirming
		// that encryption doesn't work if user hasn't supplied a password.
		await BaseItem.forceSync(folder1.id);
		await synchronizer().start();

		await switchClient(1);

		await synchronizer().start();
		folder1 = await Folder.load(folder1.id);
		expect(folder1.title).toBe('folder1'); // Still at old value

		await switchClient(2);

		// Now client 2 set the master key password
		Setting.setObjectKey('encryption.passwordCache', masterKey.id, '123456');
		await encryptionService().loadMasterKeysFromSettings();

		// Now that master key should be loaded
		expect(encryptionService().loadedMasterKeyIds()[0]).toBe(masterKey.id);

		// Decrypt all the data. Now change the title and sync again - this time the changes should be transmitted
		await decryptionWorker().start();
		folder1_2 = await Folder.save({ id: folder1.id, title: "change test" });

		// If we sync now, this time client 1 should get the changes we did earlier
		await synchronizer().start();

		await switchClient(1);

		await synchronizer().start();
		// Decrypt the data we just got
		await decryptionWorker().start();
		folder1 = await Folder.load(folder1.id);
		expect(folder1.title).toBe('change test'); // Got title from client 2
	}));

	it('should encrypt existing notes too when enabling E2EE', asyncTest(async () => {
		// First create a folder, without encryption enabled, and sync it
		let folder1 = await Folder.save({ title: "folder1" });
		await synchronizer().start();
		let files = await fileApi().list()
		let content = await fileApi().get(files.items[0].path);
		expect(content.indexOf('folder1') >= 0).toBe(true)

		// Then enable encryption and sync again
		let masterKey = await encryptionService().generateMasterKey('123456');
		masterKey = await MasterKey.save(masterKey);
		await encryptionService().enableEncryption(masterKey, '123456');
		await encryptionService().loadMasterKeysFromSettings();
		await synchronizer().start();
		
		// Even though the folder has not been changed it should have been synced again so that
		// an encrypted version of it replaces the decrypted version.
		files = await fileApi().list()
		expect(files.items.length).toBe(2);
		// By checking that the folder title is not present, we can confirm that the item has indeed been encrypted
		// One of the two items is the master key
		content = await fileApi().get(files.items[0].path);
		expect(content.indexOf('folder1') < 0).toBe(true);
		content = await fileApi().get(files.items[1].path);
		expect(content.indexOf('folder1') < 0).toBe(true);
	}));

	it('should sync resources', asyncTest(async () => {
		while (insideBeforeEach) await time.msleep(500);

		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, __dirname + '/../tests/support/photo.jpg');
		let resource1 = (await Resource.all())[0];
		let resourcePath1 = Resource.fullPath(resource1);
		await synchronizer().start();
		expect((await fileApi().list()).items.length).toBe(3);

		await switchClient(2);

		await synchronizer().start();
		let allResources = await Resource.all();
		expect(allResources.length).toBe(1);
		let resource1_2 = allResources[0];
		let resourcePath1_2 = Resource.fullPath(resource1_2);

		expect(resource1_2.id).toBe(resource1.id);
		expect(fileContentEqual(resourcePath1, resourcePath1_2)).toBe(true);
	}));

	it('should encryt resources', asyncTest(async () => {
		Setting.setValue('encryption.enabled', true);
		const masterKey = await loadEncryptionMasterKey();

		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, __dirname + '/../tests/support/photo.jpg');
		let resource1 = (await Resource.all())[0];
		let resourcePath1 = Resource.fullPath(resource1);
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		Setting.setObjectKey('encryption.passwordCache', masterKey.id, '123456');
		await encryptionService().loadMasterKeysFromSettings();

		let resource1_2 = (await Resource.all())[0];
		resource1_2 = await Resource.decrypt(resource1_2);
		let resourcePath1_2 = Resource.fullPath(resource1_2);

		expect(fileContentEqual(resourcePath1, resourcePath1_2)).toBe(true);
	}));

	it('should upload decrypted items to sync target after encryption disabled', asyncTest(async () => {
		Setting.setValue('encryption.enabled', true);
		const masterKey = await loadEncryptionMasterKey();

		let folder1 = await Folder.save({ title: "folder1" });
		await synchronizer().start();

		let allEncrypted = await allSyncTargetItemsEncrypted();
		expect(allEncrypted).toBe(true);

		await encryptionService().disableEncryption();

		await synchronizer().start();
		allEncrypted = await allSyncTargetItemsEncrypted();
		expect(allEncrypted).toBe(false);
	}));

	it('should not upload any item if encryption was enabled, and items have not been decrypted, and then encryption disabled', asyncTest(async () => {
		// For some reason I can't explain, this test is sometimes executed before beforeEach is finished
		// which means it's going to fail in unexpected way. So the loop below wait for beforeEach to be done.
		while (insideBeforeEach) await time.msleep(100);

		Setting.setValue('encryption.enabled', true);
		const masterKey = await loadEncryptionMasterKey();

		let folder1 = await Folder.save({ title: "folder1" });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		expect(Setting.value('encryption.enabled')).toBe(true);

		// If we try to disable encryption now, it should throw an error because some items are
		// currently encrypted. They must be decrypted first so that they can be sent as
		// plain text to the sync target.
		//let hasThrown = await checkThrowAsync(async () => await encryptionService().disableEncryption());
		//expect(hasThrown).toBe(true);

		// Now supply the password, and decrypt the items
		Setting.setObjectKey('encryption.passwordCache', masterKey.id, '123456');
		await encryptionService().loadMasterKeysFromSettings();	
		await decryptionWorker().start();

		// Try to disable encryption again
		hasThrown = await checkThrowAsync(async () => await encryptionService().disableEncryption());
		expect(hasThrown).toBe(false);

		// If we sync now the target should receive the decrypted items
		await synchronizer().start();
		allEncrypted = await allSyncTargetItemsEncrypted();
		expect(allEncrypted).toBe(false);
	}));

	it('should encrypt remote resources after encryption has been enabled', asyncTest(async () => {
		while (insideBeforeEach) await time.msleep(100);

		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, __dirname + '/../tests/support/photo.jpg');
		let resource1 = (await Resource.all())[0];
		await synchronizer().start();

		expect(await allSyncTargetItemsEncrypted()).toBe(false);

		const masterKey = await loadEncryptionMasterKey();
		await encryptionService().enableEncryption(masterKey, '123456');
		await encryptionService().loadMasterKeysFromSettings();

		await synchronizer().start();

		expect(await allSyncTargetItemsEncrypted()).toBe(true);
	}));

	it('should upload encrypted resource, but it should not mark the blob as encrypted locally', asyncTest(async () => {
		while (insideBeforeEach) await time.msleep(100);

		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, __dirname + '/../tests/support/photo.jpg');
		const masterKey = await loadEncryptionMasterKey();
		await encryptionService().enableEncryption(masterKey, '123456');
		await encryptionService().loadMasterKeysFromSettings();
		await synchronizer().start();

		let resource1 = (await Resource.all())[0];
		expect(resource1.encryption_blob_encrypted).toBe(0);
	}));

	it('should create remote items with UTF-8 content', asyncTest(async () => {
		let folder = await Folder.save({ title: "Fahrräder" });
		await Note.save({ title: "Fahrräder", body: "Fahrräder", parent_id: folder.id });
		let all = await allItems();

		await synchronizer().start();

		await localItemsSameAsRemote(all, expect);
	}));

});