/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { setupDatabase, allSyncTargetItemsEncrypted, kvStore, revisionService, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, encryptionService, loadEncryptionMasterKey, fileContentEqual, decryptionWorker, checkThrowAsync, asyncTest } = require('test-utils.js');
const { shim } = require('lib/shim.js');
const fs = require('fs-extra');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const Resource = require('lib/models/Resource.js');
const ResourceFetcher = require('lib/services/ResourceFetcher');
const Tag = require('lib/models/Tag.js');
const { Database } = require('lib/database.js');
const Setting = require('lib/models/Setting.js');
const MasterKey = require('lib/models/MasterKey');
const BaseItem = require('lib/models/BaseItem.js');
const Revision = require('lib/models/Revision.js');
const BaseModel = require('lib/BaseModel.js');
const SyncTargetRegistry = require('lib/SyncTargetRegistry.js');
const WelcomeUtils = require('lib/WelcomeUtils');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000 + 30000; // The first test is slow because the database needs to be built

async function allNotesFolders() {
	let folders = await Folder.all();
	let notes = await Note.all();
	return folders.concat(notes);
}

async function remoteItemsByTypes(types) {
	const list = await fileApi().list();
	if (list.has_more) throw new Error('Not implemented!!!');
	const files = list.items;

	const output = [];
	for (const file of files) {
		const remoteContent = await fileApi().get(file.path);
		const content = await BaseItem.unserialize(remoteContent);
		if (types.indexOf(content.type_) < 0) continue;
		output.push(content);
	}
	return output;
}

async function remoteNotesAndFolders() {
	return remoteItemsByTypes([BaseModel.TYPE_NOTE, BaseModel.TYPE_FOLDER]);
}

async function remoteNotesFoldersResources() {
	return remoteItemsByTypes([BaseModel.TYPE_NOTE, BaseModel.TYPE_FOLDER, BaseModel.TYPE_RESOURCE]);
}

async function remoteResources() {
	return remoteItemsByTypes([BaseModel.TYPE_RESOURCE]);
}

async function localNotesFoldersSameAsRemote(locals, expect) {
	let error = null;
	try {
		const nf = await remoteNotesAndFolders();
		expect(locals.length).toBe(nf.length);

		for (let i = 0; i < locals.length; i++) {
			let dbItem = locals[i];
			let path = BaseItem.systemPath(dbItem);
			let remote = await fileApi().stat(path);

			expect(!!remote).toBe(true);
			if (!remote) continue;

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
		let folder = await Folder.save({ title: 'folder1' });
		await Note.save({ title: 'un', parent_id: folder.id });

		let all = await allNotesFolders();

		await synchronizer().start();

		await localNotesFoldersSameAsRemote(all, expect);
	}));

	it('should update remote items', asyncTest(async () => {
		let folder = await Folder.save({ title: 'folder1' });
		let note = await Note.save({ title: 'un', parent_id: folder.id });
		await synchronizer().start();

		await Note.save({ title: 'un UPDATE', id: note.id });

		let all = await allNotesFolders();
		await synchronizer().start();

		await localNotesFoldersSameAsRemote(all, expect);
	}));

	it('should create local items', asyncTest(async () => {
		let folder = await Folder.save({ title: 'folder1' });
		await Note.save({ title: 'un', parent_id: folder.id });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();

		let all = await allNotesFolders();

		await localNotesFoldersSameAsRemote(all, expect);
	}));

	it('should update local items', asyncTest(async () => {
		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();

		await sleep(0.1);

		let note2 = await Note.load(note1.id);
		note2.title = 'Updated on client 2';
		await Note.save(note2);
		note2 = await Note.load(note2.id);

		await synchronizer().start();

		await switchClient(1);

		await synchronizer().start();

		let all = await allNotesFolders();

		await localNotesFoldersSameAsRemote(all, expect);
	}));

	it('should resolve note conflicts', asyncTest(async () => {
		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		let note2 = await Note.load(note1.id);
		note2.title = 'Updated on client 2';
		await Note.save(note2);
		note2 = await Note.load(note2.id);
		await synchronizer().start();

		await switchClient(1);

		let note2conf = await Note.load(note1.id);
		note2conf.title = 'Updated on client 1';
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
			expect(conflictedNote[n]).toBe(note2conf[n], `Property: ${n}`);
		}

		let noteUpdatedFromRemote = await Note.load(note1.id);
		for (let n in noteUpdatedFromRemote) {
			if (!noteUpdatedFromRemote.hasOwnProperty(n)) continue;
			expect(noteUpdatedFromRemote[n]).toBe(note2[n], `Property: ${n}`);
		}
	}));

	it('should resolve folders conflicts', asyncTest(async () => {
		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await synchronizer().start();

		await switchClient(2); // ----------------------------------

		await synchronizer().start();

		await sleep(0.1);

		let folder1_modRemote = await Folder.load(folder1.id);
		folder1_modRemote.title = 'folder1 UPDATE CLIENT 2';
		await Folder.save(folder1_modRemote);
		folder1_modRemote = await Folder.load(folder1_modRemote.id);

		await synchronizer().start();

		await switchClient(1); // ----------------------------------

		await sleep(0.1);

		let folder1_modLocal = await Folder.load(folder1.id);
		folder1_modLocal.title = 'folder1 UPDATE CLIENT 1';
		await Folder.save(folder1_modLocal);
		folder1_modLocal = await Folder.load(folder1.id);

		await synchronizer().start();

		let folder1_final = await Folder.load(folder1.id);
		expect(folder1_final.title).toBe(folder1_modRemote.title);
	}));

	it('should delete remote notes', asyncTest(async () => {
		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();

		await sleep(0.1);

		await Note.delete(note1.id);

		await synchronizer().start();

		const remotes = await remoteNotesAndFolders();
		expect(remotes.length).toBe(1);
		expect(remotes[0].id).toBe(folder1.id);

		let deletedItems = await BaseItem.deletedItems(syncTargetId());
		expect(deletedItems.length).toBe(0);
	}));

	it('should not created deleted_items entries for items deleted via sync', asyncTest(async () => {
		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
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

		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		let note2 = await Note.save({ title: 'deux', parent_id: folder1.id });
		let context1 = await synchronizer().start();

		await switchClient(2);

		let context2 = await synchronizer().start();
		await Note.delete(note1.id);
		context2 = await synchronizer().start({ context: context2 });

		await switchClient(1);

		context1 = await synchronizer().start({ context: context1 });
		let items = await allNotesFolders();
		expect(items.length).toBe(2);
		let deletedItems = await BaseItem.deletedItems(syncTargetId());
		expect(deletedItems.length).toBe(0);
		await Note.delete(note2.id);
		context1 = await synchronizer().start({ context: context1 });
	}));

	it('should delete remote folder', asyncTest(async () => {
		let folder1 = await Folder.save({ title: 'folder1' });
		let folder2 = await Folder.save({ title: 'folder2' });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();

		await sleep(0.1);

		await Folder.delete(folder2.id);

		await synchronizer().start();

		let all = await allNotesFolders();
		await localNotesFoldersSameAsRemote(all, expect);
	}));

	it('should delete local folder', asyncTest(async () => {
		let folder1 = await Folder.save({ title: 'folder1' });
		let folder2 = await Folder.save({ title: 'folder2' });
		let context1 = await synchronizer().start();

		await switchClient(2);

		let context2 = await synchronizer().start();
		await Folder.delete(folder2.id);
		await synchronizer().start({ context: context2 });

		await switchClient(1);

		await synchronizer().start({ context: context1 });
		let items = await allNotesFolders();
		await localNotesFoldersSameAsRemote(items, expect);
	}));

	it('should resolve conflict if remote folder has been deleted, but note has been added to folder locally', asyncTest(async () => {
		let folder1 = await Folder.save({ title: 'folder1' });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		await Folder.delete(folder1.id);
		await synchronizer().start();

		await switchClient(1);

		let note = await Note.save({ title: 'note1', parent_id: folder1.id });
		await synchronizer().start();
		let items = await allNotesFolders();
		expect(items.length).toBe(1);
		expect(items[0].title).toBe('note1');
		expect(items[0].is_conflict).toBe(1);
	}));

	it('should resolve conflict if note has been deleted remotely and locally', asyncTest(async () => {
		let folder = await Folder.save({ title: 'folder' });
		let note = await Note.save({ title: 'note', parent_id: folder.title });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		await Note.delete(note.id);
		await synchronizer().start();

		await switchClient(1);

		await Note.delete(note.id);
		await synchronizer().start();

		let items = await allNotesFolders();
		expect(items.length).toBe(1);
		expect(items[0].title).toBe('folder');

		await localNotesFoldersSameAsRemote(items, expect);
	}));

	it('should cross delete all folders', asyncTest(async () => {
		// If client1 and 2 have two folders, client 1 deletes item 1 and client
		// 2 deletes item 2, they should both end up with no items after sync.

		let folder1 = await Folder.save({ title: 'folder1' });
		let folder2 = await Folder.save({ title: 'folder2' });
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

		let items2 = await allNotesFolders();

		await switchClient(1);

		await synchronizer().start();

		let items1 = await allNotesFolders();

		expect(items1.length).toBe(0);
		expect(items1.length).toBe(items2.length);
	}));

	it('should handle conflict when remote note is deleted then local note is modified', asyncTest(async () => {
		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
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
		let folder1 = await Folder.save({ title: 'folder1' });
		let folder2 = await Folder.save({ title: 'folder2' });
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
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

		let items = await allNotesFolders();

		expect(items.length).toBe(1);
	}));

	it('should allow duplicate folder titles', asyncTest(async () => {
		let localF1 = await Folder.save({ title: 'folder' });

		await switchClient(2);

		let remoteF2 = await Folder.save({ title: 'folder' });
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

		let f1 = await Folder.save({ title: 'folder' });
		let n1 = await Note.save({ title: 'mynote' });
		let n2 = await Note.save({ title: 'mynote2' });
		let tag = await Tag.save({ title: 'mytag' });
		let context1 = await synchronizer().start();

		await switchClient(2);

		let context2 = await synchronizer().start();
		if (withEncryption) {
			const masterKey_2 = await MasterKey.load(masterKey.id);
			await encryptionService().loadMasterKey_(masterKey_2, '123456', true);
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
		context2 = await synchronizer().start({ context: context2 });

		await switchClient(1);

		context1 = await synchronizer().start({ context: context1 });
		let remoteNoteIds = await Tag.noteIds(tag.id);
		expect(remoteNoteIds.length).toBe(2);
		await Tag.removeNote(tag.id, n1.id);
		remoteNoteIds = await Tag.noteIds(tag.id);
		expect(remoteNoteIds.length).toBe(1);
		context1 = await synchronizer().start({ context: context1 });

		await switchClient(2);

		context2 = await synchronizer().start({ context: context2 });
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
		let f1 = await Folder.save({ title: 'folder' });
		let n1 = await Note.save({ title: 'mynote', parent_id: f1.id, is_conflict: 1 });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		let notes = await Note.all();
		let folders = await Folder.all();
		expect(notes.length).toBe(0);
		expect(folders.length).toBe(1);
	}));

	it('should not try to delete on remote conflicted notes that have been deleted', asyncTest(async () => {
		let f1 = await Folder.save({ title: 'folder' });
		let n1 = await Note.save({ title: 'mynote', parent_id: f1.id });
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

		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'un', is_todo: 1, parent_id: folder1.id });
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
		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'un', is_todo: 1, parent_id: folder1.id });
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
		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'un', is_todo: 1, parent_id: folder1.id });
		const noteId = note1.id;
		await synchronizer().start();
		let disabledItems = await BaseItem.syncDisabledItems(syncTargetId());
		expect(disabledItems.length).toBe(0);
		await Note.save({ id: noteId, title: 'un mod' });
		synchronizer().testingHooks_ = ['notesRejectedByTarget'];
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
		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'un', body: 'to be encrypted', parent_id: folder1.id });
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
		await encryptionService().loadMasterKey_(masterKey_2, '123456', true);
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
		let folder1 = await Folder.save({ title: 'folder1' });
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
		await Folder.save({ id: folder1.id, title: 'change test' });

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
		let folder1 = await Folder.save({ title: 'folder1' });
		await synchronizer().start();
		let files = await fileApi().list();
		let content = await fileApi().get(files.items[0].path);
		expect(content.indexOf('folder1') >= 0).toBe(true);

		// Then enable encryption and sync again
		let masterKey = await encryptionService().generateMasterKey('123456');
		masterKey = await MasterKey.save(masterKey);
		await encryptionService().enableEncryption(masterKey, '123456');
		await encryptionService().loadMasterKeysFromSettings();
		await synchronizer().start();

		// Even though the folder has not been changed it should have been synced again so that
		// an encrypted version of it replaces the decrypted version.
		files = await fileApi().list();
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

		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		let resource1 = (await Resource.all())[0];
		let resourcePath1 = Resource.fullPath(resource1);
		await synchronizer().start();
		expect((await remoteNotesFoldersResources()).length).toBe(3);

		await switchClient(2);

		await synchronizer().start();
		let allResources = await Resource.all();
		expect(allResources.length).toBe(1);
		let resource1_2 = allResources[0];
		let ls = await Resource.localState(resource1_2);
		expect(resource1_2.id).toBe(resource1.id);
		expect(ls.fetch_status).toBe(Resource.FETCH_STATUS_IDLE);

		const fetcher = new ResourceFetcher(() => { return synchronizer().api(); });
		fetcher.queueDownload_(resource1_2.id);
		await fetcher.waitForAllFinished();

		resource1_2 = await Resource.load(resource1.id);
		ls = await Resource.localState(resource1_2);
		expect(ls.fetch_status).toBe(Resource.FETCH_STATUS_DONE);

		let resourcePath1_2 = Resource.fullPath(resource1_2);
		expect(fileContentEqual(resourcePath1, resourcePath1_2)).toBe(true);
	}));

	it('should handle resource download errors', asyncTest(async () => {
		while (insideBeforeEach) await time.msleep(500);

		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		let resource1 = (await Resource.all())[0];
		let resourcePath1 = Resource.fullPath(resource1);
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();

		const fetcher = new ResourceFetcher(() => {
			return {
			// Simulate a failed download
				get: () => { return new Promise((resolve, reject) => { reject(new Error('did not work')); }); },
			};
		});
		fetcher.queueDownload_(resource1.id);
		await fetcher.waitForAllFinished();

		resource1 = await Resource.load(resource1.id);
		let ls = await Resource.localState(resource1);
		expect(ls.fetch_status).toBe(Resource.FETCH_STATUS_ERROR);
		expect(ls.fetch_error).toBe('did not work');
	}));

	it('should set the resource file size if it is missing', asyncTest(async () => {
		while (insideBeforeEach) await time.msleep(500);

		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		let r1 = (await Resource.all())[0];
		await Resource.setFileSizeOnly(r1.id, -1);
		r1 = await Resource.load(r1.id);
		expect(r1.size).toBe(-1);

		const fetcher = new ResourceFetcher(() => { return synchronizer().api(); });
		fetcher.queueDownload_(r1.id);
		await fetcher.waitForAllFinished();
		r1 = await Resource.load(r1.id);
		expect(r1.size).toBe(2720);
	}));

	it('should delete resources', asyncTest(async () => {
		while (insideBeforeEach) await time.msleep(500);

		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		let resource1 = (await Resource.all())[0];
		let resourcePath1 = Resource.fullPath(resource1);
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		let allResources = await Resource.all();
		expect(allResources.length).toBe(1);
		let all = await fileApi().list();
		expect((await remoteNotesFoldersResources()).length).toBe(3);
		await Resource.delete(resource1.id);
		await synchronizer().start();
		expect((await remoteNotesFoldersResources()).length).toBe(2);

		const remoteBlob = await fileApi().stat(`.resource/${resource1.id}`);
		expect(!remoteBlob).toBe(true);

		await switchClient(1);

		expect(await shim.fsDriver().exists(resourcePath1)).toBe(true);
		await synchronizer().start();
		allResources = await Resource.all();
		expect(allResources.length).toBe(0);
		expect(await shim.fsDriver().exists(resourcePath1)).toBe(false);
	}));

	it('should encryt resources', asyncTest(async () => {
		Setting.setValue('encryption.enabled', true);
		const masterKey = await loadEncryptionMasterKey();

		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		let resource1 = (await Resource.all())[0];
		let resourcePath1 = Resource.fullPath(resource1);
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		Setting.setObjectKey('encryption.passwordCache', masterKey.id, '123456');
		await encryptionService().loadMasterKeysFromSettings();

		const fetcher = new ResourceFetcher(() => { return synchronizer().api(); });
		fetcher.queueDownload_(resource1.id);
		await fetcher.waitForAllFinished();

		let resource1_2 = (await Resource.all())[0];
		resource1_2 = await Resource.decrypt(resource1_2);
		let resourcePath1_2 = Resource.fullPath(resource1_2);

		expect(fileContentEqual(resourcePath1, resourcePath1_2)).toBe(true);
	}));

	it('should upload decrypted items to sync target after encryption disabled', asyncTest(async () => {
		Setting.setValue('encryption.enabled', true);
		const masterKey = await loadEncryptionMasterKey();

		let folder1 = await Folder.save({ title: 'folder1' });
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

		let folder1 = await Folder.save({ title: 'folder1' });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		expect(Setting.value('encryption.enabled')).toBe(true);

		// If we try to disable encryption now, it should throw an error because some items are
		// currently encrypted. They must be decrypted first so that they can be sent as
		// plain text to the sync target.
		// let hasThrown = await checkThrowAsync(async () => await encryptionService().disableEncryption());
		// expect(hasThrown).toBe(true);

		// Now supply the password, and decrypt the items
		Setting.setObjectKey('encryption.passwordCache', masterKey.id, '123456');
		await encryptionService().loadMasterKeysFromSettings();
		await decryptionWorker().start();

		// Try to disable encryption again
		const hasThrown = await checkThrowAsync(async () => await encryptionService().disableEncryption());
		expect(hasThrown).toBe(false);

		// If we sync now the target should receive the decrypted items
		await synchronizer().start();
		const allEncrypted = await allSyncTargetItemsEncrypted();
		expect(allEncrypted).toBe(false);
	}));

	it('should set the resource file size after decryption', asyncTest(async () => {
		Setting.setValue('encryption.enabled', true);
		const masterKey = await loadEncryptionMasterKey();

		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		let resource1 = (await Resource.all())[0];
		await Resource.setFileSizeOnly(resource1.id, -1);
		let resourcePath1 = Resource.fullPath(resource1);
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		Setting.setObjectKey('encryption.passwordCache', masterKey.id, '123456');
		await encryptionService().loadMasterKeysFromSettings();

		const fetcher = new ResourceFetcher(() => { return synchronizer().api(); });
		fetcher.queueDownload_(resource1.id);
		await fetcher.waitForAllFinished();
		await decryptionWorker().start();

		const resource1_2 = await Resource.load(resource1.id);
		expect(resource1_2.size).toBe(2720);
	}));

	it('should encrypt remote resources after encryption has been enabled', asyncTest(async () => {
		while (insideBeforeEach) await time.msleep(100);

		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
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

		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		const masterKey = await loadEncryptionMasterKey();
		await encryptionService().enableEncryption(masterKey, '123456');
		await encryptionService().loadMasterKeysFromSettings();
		await synchronizer().start();

		let resource1 = (await Resource.all())[0];
		expect(resource1.encryption_blob_encrypted).toBe(0);
	}));

	it('should create remote items with UTF-8 content', asyncTest(async () => {
		let folder = await Folder.save({ title: 'Fahrräder' });
		await Note.save({ title: 'Fahrräder', body: 'Fahrräder', parent_id: folder.id });
		let all = await allNotesFolders();

		await synchronizer().start();

		await localNotesFoldersSameAsRemote(all, expect);
	}));

	it('should update remote items but not pull remote changes', asyncTest(async () => {
		let folder = await Folder.save({ title: 'folder1' });
		let note = await Note.save({ title: 'un', parent_id: folder.id });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		await Note.save({ title: 'deux', parent_id: folder.id });
		await synchronizer().start();

		await switchClient(1);

		await Note.save({ title: 'un UPDATE', id: note.id });
		await synchronizer().start({ syncSteps: ['update_remote'] });
		let all = await allNotesFolders();
		expect(all.length).toBe(2);

		await switchClient(2);

		await synchronizer().start();
		let note2 = await Note.load(note.id);
		expect(note2.title).toBe('un UPDATE');
	}));

	it('should create a new Welcome notebook on each client', asyncTest(async () => {
		// Create the Welcome items on two separate clients

		await WelcomeUtils.createWelcomeItems();
		await synchronizer().start();

		await switchClient(2);

		await WelcomeUtils.createWelcomeItems();
		const beforeFolderCount = (await Folder.all()).length;
		const beforeNoteCount = (await Note.all()).length;
		expect(beforeFolderCount === 1).toBe(true);
		expect(beforeNoteCount > 1).toBe(true);

		await synchronizer().start();

		const afterFolderCount = (await Folder.all()).length;
		const afterNoteCount = (await Note.all()).length;

		expect(afterFolderCount).toBe(beforeFolderCount * 2);
		expect(afterNoteCount).toBe(beforeNoteCount * 2);

		// Changes to the Welcome items should be synced to all clients

		const f1 = (await Folder.all())[0];
		await Folder.save({ id: f1.id, title: 'Welcome MOD' });

		await synchronizer().start();

		await switchClient(1);

		await synchronizer().start();

		const f1_1 = await Folder.load(f1.id);
		expect(f1_1.title).toBe('Welcome MOD');
	}));

	it('should not save revisions when updating a note via sync', asyncTest(async () => {
		// When a note is updated, a revision of the original is created.
		// Here, on client 1, the note is updated for the first time, however since it is
		// via sync, we don't create a revision - that revision has already been created on client
		// 2 and is going to be synced.

		const n1 = await Note.save({ title: 'testing' });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		await Note.save({ id: n1.id, title: 'mod from client 2' });
		await revisionService().collectRevisions();
		const allRevs1 = await Revision.allByType(BaseModel.TYPE_NOTE, n1.id);
		expect(allRevs1.length).toBe(1);
		await synchronizer().start();

		await switchClient(1);

		await synchronizer().start();
		const allRevs2 = await Revision.allByType(BaseModel.TYPE_NOTE, n1.id);
		expect(allRevs2.length).toBe(1);
		expect(allRevs2[0].id).toBe(allRevs1[0].id);
	}));

	it('should not save revisions when deleting a note via sync', asyncTest(async () => {
		const n1 = await Note.save({ title: 'testing' });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		await Note.delete(n1.id);
		await revisionService().collectRevisions(); // REV 1
		{
			const allRevs = await Revision.allByType(BaseModel.TYPE_NOTE, n1.id);
			expect(allRevs.length).toBe(1);
		}
		await synchronizer().start();

		await switchClient(1);

		await synchronizer().start(); // The local note gets deleted here, however a new rev is *not* created
		{
			const allRevs = await Revision.allByType(BaseModel.TYPE_NOTE, n1.id);
			expect(allRevs.length).toBe(1);
		}

		const notes = await Note.all();
		expect(notes.length).toBe(0);
	}));

	it('should not save revisions when an item_change has been generated as a result of a sync', asyncTest(async () => {
		// When a note is modified an item_change object is going to be created. This
		// is used for example to tell the search engine, when note should be indexed. It is
		// also used by the revision service to tell what note should get a new revision.
		// When a note is modified via sync, this item_change object is also created. The issue
		// is that we don't want to create revisions for these particular item_changes, because
		// such revision has already been created on another client (whatever client initially
		// modified the note), and that rev is going to be synced.
		//
		// So in the end we need to make sure that we don't create these unecessary additional revisions.

		const n1 = await Note.save({ title: 'testing' });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		await Note.save({ id: n1.id, title: 'mod from client 2' });
		await revisionService().collectRevisions();
		await synchronizer().start();

		await switchClient(1);

		await synchronizer().start();

		{
			const allRevs = await Revision.allByType(BaseModel.TYPE_NOTE, n1.id);
			expect(allRevs.length).toBe(1);
		}

		await revisionService().collectRevisions();

		{
			const allRevs = await Revision.allByType(BaseModel.TYPE_NOTE, n1.id);
			expect(allRevs.length).toBe(1);
		}
	}));

	it('should handle case when new rev is created on client, then older rev arrives later via sync', asyncTest(async () => {
		// - C1 creates note 1
		// - C1 modifies note 1 - REV1 created
		// - C1 sync
		// - C2 sync
		// - C2 receives note 1
		// - C2 modifies note 1 - REV2 created (but not based on REV1)
		// - C2 receives REV1
		//
		// In that case, we need to make sure that REV1 and REV2 are both valid and can be retrieved.
		// Even though REV1 was created before REV2, REV2 is *not* based on REV1. This is not ideal
		// due to unecessary data being saved, but a possible edge case and we simply need to check
		// all the data is valid.

		const n1 = await Note.save({ title: 'note' });
		await Note.save({ id: n1.id, title: 'note REV1' });
		await revisionService().collectRevisions(); // REV1
		expect((await Revision.allByType(BaseModel.TYPE_NOTE, n1.id)).length).toBe(1);
		await synchronizer().start();

		await switchClient(2);

		synchronizer().testingHooks_ = ['skipRevisions'];
		await synchronizer().start();
		synchronizer().testingHooks_ = [];

		await Note.save({ id: n1.id, title: 'note REV2' });
		await revisionService().collectRevisions(); // REV2
		expect((await Revision.allByType(BaseModel.TYPE_NOTE, n1.id)).length).toBe(1);
		await synchronizer().start(); // Sync the rev that had been skipped above with skipRevisions

		const revisions = await Revision.allByType(BaseModel.TYPE_NOTE, n1.id);
		expect(revisions.length).toBe(2);

		expect((await revisionService().revisionNote(revisions, 0)).title).toBe('note REV1');
		expect((await revisionService().revisionNote(revisions, 1)).title).toBe('note REV2');
	}));

	it('should not download resources over the limit', asyncTest(async () => {
		const note1 = await Note.save({ title: 'note' });
		await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		await synchronizer().start();

		await switchClient(2);

		const previousMax = synchronizer().maxResourceSize_;
		synchronizer().maxResourceSize_ = 1;
		await synchronizer().start();
		synchronizer().maxResourceSize_ = previousMax;

		const syncItems = await BaseItem.allSyncItems(syncTargetId());
		expect(syncItems.length).toBe(2);
		expect(syncItems[1].item_location).toBe(BaseItem.SYNC_ITEM_LOCATION_REMOTE);
		expect(syncItems[1].sync_disabled).toBe(1);
	}));

	it('should not upload a resource if it has not been fetched yet', asyncTest(async () => {
		// In some rare cases, the synchronizer might try to upload a resource even though it
		// doesn't have the resource file. It can happen in this situation:
		// - C1 create resource
		// - C1 sync
		// - C2 sync
		// - C2 resource metadata is received but ResourceFetcher hasn't downloaded the file yet
		// - C2 enables E2EE - all the items are marked for forced sync
		// - C2 sync
		// The synchronizer will try to upload the resource, even though it doesn't have the file,
		// so we need to make sure it doesn't. But also that once it gets the file, the resource
		// does get uploaded.

		const note1 = await Note.save({ title: 'note' });
		await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		const resource = (await Resource.all())[0];
		await Resource.setLocalState(resource.id, { fetch_status: Resource.FETCH_STATUS_IDLE });
		await synchronizer().start();

		expect((await remoteResources()).length).toBe(0);

		await Resource.setLocalState(resource.id, { fetch_status: Resource.FETCH_STATUS_DONE });
		await synchronizer().start();

		expect((await remoteResources()).length).toBe(1);
	}));

	it('should decrypt the resource metadata, but not try to decrypt the file, if it is not present', asyncTest(async () => {
		const note1 = await Note.save({ title: 'note' });
		await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		const masterKey = await loadEncryptionMasterKey();
		await encryptionService().enableEncryption(masterKey, '123456');
		await encryptionService().loadMasterKeysFromSettings();
		await synchronizer().start();
		expect(await allSyncTargetItemsEncrypted()).toBe(true);

		await switchClient(2);

		await synchronizer().start();
		Setting.setObjectKey('encryption.passwordCache', masterKey.id, '123456');
		await encryptionService().loadMasterKeysFromSettings();
		await decryptionWorker().start();

		let resource = (await Resource.all())[0];

		expect(!!resource.encryption_applied).toBe(false);
		expect(!!resource.encryption_blob_encrypted).toBe(true);

		const resourceFetcher = new ResourceFetcher(() => { return synchronizer().api(); });
		await resourceFetcher.start();
		await resourceFetcher.waitForAllFinished();

		const ls = await Resource.localState(resource);
		expect(ls.fetch_status).toBe(Resource.FETCH_STATUS_DONE);

		await decryptionWorker().start();
		resource = (await Resource.all())[0];

		expect(!!resource.encryption_blob_encrypted).toBe(false);
	}));

	it('should not create revisions when item is modified as a result of decryption', asyncTest(async () => {
		// Handle this scenario:
		// - C1 creates note
		// - C1 never changes it
		// - E2EE is enabled
		// - C1 sync
		// - More than one week later (as defined by oldNoteCutOffDate_), C2 sync
		// - C2 enters master password and note gets decrypted
		//
		// Technically at this point the note is modified (from encrypted to non-encrypted) and thus a ItemChange
		// object is created. The note is also older than oldNoteCutOffDate. However, this should not lead to the
		// creation of a revision because that change was not the result of a user action.
		// I guess that's the general rule - changes that come from user actions should result in revisions,
		// while automated changes (sync, decryption) should not.

		const dateInPast = revisionService().oldNoteCutOffDate_() - 1000;

		await Note.save({ title: 'ma note', updated_time: dateInPast, created_time: dateInPast }, { autoTimestamp: false });
		const masterKey = await loadEncryptionMasterKey();
		await encryptionService().enableEncryption(masterKey, '123456');
		await encryptionService().loadMasterKeysFromSettings();
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();

		Setting.setObjectKey('encryption.passwordCache', masterKey.id, '123456');
		await encryptionService().loadMasterKeysFromSettings();
		await decryptionWorker().start();

		await revisionService().collectRevisions();

		expect((await Revision.all()).length).toBe(0);
	}));

	it('should stop trying to decrypt item after a few attempts', asyncTest(async () => {
		let hasThrown;

		const note = await Note.save({ title: 'ma note' });
		const masterKey = await loadEncryptionMasterKey();
		await encryptionService().enableEncryption(masterKey, '123456');
		await encryptionService().loadMasterKeysFromSettings();
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();

		// First, simulate a broken note and check that the decryption worker
		// gives up decrypting after a number of tries. This is mainly relevant
		// for data that crashes the mobile application - we don't want to keep
		// decrypting these.

		const encryptedNote = await Note.load(note.id);
		const goodCipherText = encryptedNote.encryption_cipher_text;
		await Note.save({ id: note.id, encryption_cipher_text: 'doesntlookright' });

		Setting.setObjectKey('encryption.passwordCache', masterKey.id, '123456');
		await encryptionService().loadMasterKeysFromSettings();

		hasThrown = await checkThrowAsync(async () => await decryptionWorker().start({ errorHandler: 'throw' }));
		expect(hasThrown).toBe(true);

		hasThrown = await checkThrowAsync(async () => await decryptionWorker().start({ errorHandler: 'throw' }));
		expect(hasThrown).toBe(true);

		// Third time, an error is logged and no error is thrown
		hasThrown = await checkThrowAsync(async () => await decryptionWorker().start({ errorHandler: 'throw' }));
		expect(hasThrown).toBe(false);

		const disabledItems = await decryptionWorker().decryptionDisabledItems();
		expect(disabledItems.length).toBe(1);
		expect(disabledItems[0].id).toBe(note.id);

		expect((await kvStore().all()).length).toBe(1);
		await kvStore().clear();

		// Now check that if it fails once but succeed the second time, the note
		// is correctly decrypted and the counters are cleared.

		hasThrown = await checkThrowAsync(async () => await decryptionWorker().start({ errorHandler: 'throw' }));
		expect(hasThrown).toBe(true);

		await Note.save({ id: note.id, encryption_cipher_text: goodCipherText });

		hasThrown = await checkThrowAsync(async () => await decryptionWorker().start({ errorHandler: 'throw' }));
		expect(hasThrown).toBe(false);

		const decryptedNote = await Note.load(note.id);
		expect(decryptedNote.title).toBe('ma note');

		expect((await kvStore().all()).length).toBe(0);
		expect((await decryptionWorker().decryptionDisabledItems()).length).toBe(0);
	}));

	it('should not wipe out user data when syncing with an empty target', asyncTest(async () => {
		for (let i = 0; i < 10; i++) await Note.save({ title: 'note' });

		Setting.setValue('sync.wipeOutFailSafe', true);
		await synchronizer().start();
		await fileApi().clearRoot(); // oops
		await synchronizer().start();
		expect((await Note.all()).length).toBe(10); // but since the fail-safe if on, the notes have not been deleted

		Setting.setValue('sync.wipeOutFailSafe', false); // Now switch it off
		await synchronizer().start();
		expect((await Note.all()).length).toBe(0); // Since the fail-safe was off, the data has been cleared

		// Handle case where the sync target has been wiped out, then the user creates one note and sync.

		for (let i = 0; i < 10; i++) await Note.save({ title: 'note' });
		Setting.setValue('sync.wipeOutFailSafe', true);
		await synchronizer().start();
		await fileApi().clearRoot();
		await Note.save({ title: 'ma note encore' });
		await synchronizer().start();
		expect((await Note.all()).length).toBe(11);
	}));

	it('should not sync if client sync version is lower than target', asyncTest(async () => {
		// This should work - syncing two clients with same supported sync target version
		await synchronizer().start();
		await switchClient(2);
		await synchronizer().start();

		// This should not work - syncing two clients, but one of them has not been upgraded yet to the latest sync version
		await switchClient(1);
		Setting.setConstant('syncVersion', 2);
		await synchronizer().start();

		await switchClient(2);
		Setting.setConstant('syncVersion', 1);
		const hasThrown = await checkThrowAsync(async () => synchronizer().start({ throwOnError: true }));
		expect(hasThrown).toBe(true);
	}));

	it('should not sync when target is locked', asyncTest(async () => {
		await synchronizer().start();
		await synchronizer().acquireLock_();

		await switchClient(2);
		const hasThrown = await checkThrowAsync(async () => synchronizer().start({ throwOnError: true }));
		expect(hasThrown).toBe(true);
	}));

	it('should clear a lock if it was created by the same app as the current one', asyncTest(async () => {
		await synchronizer().start();
		await synchronizer().acquireLock_();
		expect((await synchronizer().lockFiles_()).length).toBe(1);
		await synchronizer().start({ throwOnError: true });
		expect((await synchronizer().lockFiles_()).length).toBe(0);
	}));

	it('should not encrypt notes that are shared', asyncTest(async () => {
		Setting.setValue('encryption.enabled', true);
		await loadEncryptionMasterKey();

		let folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		let note2 = await Note.save({ title: 'deux', parent_id: folder1.id });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();

		await switchClient(1);

		const origNote2 = Object.assign({}, note2);
		await BaseItem.updateShareStatus(note2, true);
		note2 = await Note.load(note2.id);

		// Sharing a note should not modify the timestamps
		expect(note2.user_updated_time).toBe(origNote2.user_updated_time);
		expect(note2.user_created_time).toBe(origNote2.user_created_time);

		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();

		// The shared note should be decrypted
		let note2_2 = await Note.load(note2.id);
		expect(note2_2.title).toBe('deux');
		expect(note2_2.is_shared).toBe(1);

		// The non-shared note should be encrypted
		let note1_2 = await Note.load(note1.id);
		expect(note1_2.title).toBe('');
	}));

});
