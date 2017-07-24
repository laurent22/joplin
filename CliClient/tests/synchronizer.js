require('source-map-support').install();
require('babel-plugin-transform-runtime');

import { time } from 'lib/time-utils.js';
import { setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId } from 'test-utils.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { Tag } from 'lib/models/tag.js';
import { Database } from 'lib/database.js';
import { Setting } from 'lib/models/setting.js';
import { BaseItem } from 'lib/models/base-item.js';
import { BaseModel } from 'lib/base-model.js';

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

jasmine.DEFAULT_TIMEOUT_INTERVAL = 9000; // The first test is slow because the database needs to be built

async function allItems() {
	let folders = await Folder.all();
	let notes = await Note.all();
	return folders.concat(notes);
}

async function localItemsSameAsRemote(locals, expect) {
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

			if (syncTargetId() == Database.enumId('syncTarget', 'filesystem')) {
				expect(remote.updated_time).toBe(Math.floor(dbItem.updated_time / 1000) * 1000);
			} else {
				expect(remote.updated_time).toBe(dbItem.updated_time);
			}

			let remoteContent = await fileApi().get(path);
			remoteContent = dbItem.type_ == BaseModel.TYPE_NOTE ? await Note.unserialize(remoteContent) : await Folder.unserialize(remoteContent);
			expect(remoteContent.title).toBe(dbItem.title);
		}
	} catch (error) {
		console.error(error);
	}
}

describe('Synchronizer', function() {

	beforeEach( async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
		done();
	});

	it('should create remote items', async (done) => {
		let folder = await Folder.save({ title: "folder1" });
		await Note.save({ title: "un", parent_id: folder.id });

		let all = await allItems();

		await synchronizer().start();

		await localItemsSameAsRemote(all, expect);

		done();
	});

	it('should update remote item', async (done) => {
		let folder = await Folder.save({ title: "folder1" });
		let note = await Note.save({ title: "un", parent_id: folder.id });
		await synchronizer().start();

		await Note.save({ title: "un UPDATE", id: note.id });

		let all = await allItems();
		await synchronizer().start();

		await localItemsSameAsRemote(all, expect);

		done();
	});

	it('should create local items', async (done) => {
		let folder = await Folder.save({ title: "folder1" });
		await Note.save({ title: "un", parent_id: folder.id });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();

		let all = await allItems();
		await localItemsSameAsRemote(all, expect);

		done();
	});

	it('should update local items', async (done) => {
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

		done();
	});

	it('should resolve note conflicts', async (done) => {
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

		await sleep(0.1);

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

		done();
	});

	it('should resolve folders conflicts', async (done) => {
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

		done();
	});

	it('should delete remote notes', async (done) => {
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

		done();
	});

	it('should delete local notes', async (done) => {
		let folder1 = await Folder.save({ title: "folder1" });
		let note1 = await Note.save({ title: "un", parent_id: folder1.id });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		await Note.delete(note1.id);
		await synchronizer().start();

		await switchClient(1);

		await synchronizer().start();
		let items = await allItems();
		expect(items.length).toBe(1);
		let deletedItems = await BaseItem.deletedItems(syncTargetId());
		expect(deletedItems.length).toBe(0);
		
		done();
	});

	it('should delete remote folder', async (done) => {
		let folder1 = await Folder.save({ title: "folder1" });
		let folder2 = await Folder.save({ title: "folder2" });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();

		await sleep(0.1);

		await Folder.delete(folder2.id);

		await synchronizer().start();

		let all = await allItems();
		localItemsSameAsRemote(all, expect);
		
		done();
	});

	it('should delete local folder', async (done) => {
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
		localItemsSameAsRemote(items, expect);
		
		done();
	});

	it('should resolve conflict if remote folder has been deleted, but note has been added to folder locally', async (done) => {
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
		
		done();
	});

	it('should resolve conflict if note has been deleted remotely and locally', async (done) => {
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

		localItemsSameAsRemote(items, expect);
		
		done();
	});

	it('should cross delete all folders', async (done) => {
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
		
		done();
	});

	it('should handle conflict when remote note is deleted then local note is modified', async (done) => {
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
		
		done();
	});

	it('should handle conflict when remote folder is deleted then local folder is renamed', async (done) => {
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
		
		done();
	});

	it('should allow duplicate folder titles', async (done) => {
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

		done();
	});

	it('should sync tags', async (done) => {
		let f1 = await Folder.save({ title: "folder" });
		let n1 = await Note.save({ title: "mynote" });
		let n2 = await Note.save({ title: "mynote2" });
		let tag = await Tag.save({ title: 'mytag' });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		let remoteTag = await Tag.loadByTitle(tag.title);
		expect(!!remoteTag).toBe(true);
		expect(remoteTag.id).toBe(tag.id);
		await Tag.addNote(remoteTag.id, n1.id);
		await Tag.addNote(remoteTag.id, n2.id);
		let noteIds = await Tag.tagNoteIds(tag.id);
		expect(noteIds.length).toBe(2);
		await synchronizer().start();

		await switchClient(1);

		await synchronizer().start();
		let remoteNoteIds = await Tag.tagNoteIds(tag.id);
		expect(remoteNoteIds.length).toBe(2);
		await Tag.removeNote(tag.id, n1.id);
		remoteNoteIds = await Tag.tagNoteIds(tag.id);
		expect(remoteNoteIds.length).toBe(1);
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		noteIds = await Tag.tagNoteIds(tag.id);
		expect(noteIds.length).toBe(1);
		expect(remoteNoteIds[0]).toBe(noteIds[0]);

		done();
	});

	it('should not sync notes with conflicts', async (done) => {
		let f1 = await Folder.save({ title: "folder" });
		let n1 = await Note.save({ title: "mynote", parent_id: f1.id, is_conflict: 1 });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		let notes = await Note.all();
		let folders = await Folder.all()
		expect(notes.length).toBe(0);
		expect(folders.length).toBe(1);

		done();
	});

	it('should not try to delete on remote conflicted notes that have been deleted', async (done) => {
		let f1 = await Folder.save({ title: "folder" });
		let n1 = await Note.save({ title: "mynote", parent_id: f1.id });
		await synchronizer().start();

		await switchClient(2);

		await synchronizer().start();
		await Note.save({ id: n1.id, is_conflict: 1 });
		await Note.delete(n1.id);
		const deletedItems = await BaseItem.deletedItems(syncTargetId());

		expect(deletedItems.length).toBe(0);

		done();
	});
	
});