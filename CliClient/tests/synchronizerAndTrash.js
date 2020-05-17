/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { setupDatabase, allSyncTargetItemsEncrypted, kvStore, revisionService, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, clearDatabase, switchClient, currentClientId, syncTargetId, encryptionService, loadEncryptionMasterKey, fileContentEqual, decryptionWorker, checkThrowAsync, asyncTest, ids, sortedIds } = require('test-utils.js');
const { shim } = require('lib/shim.js');
const fs = require('fs-extra');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const NoteTag = require('lib/models/NoteTag.js');
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
const { TRASH_TAG_ID, TRASH_TAG_NAME, CONFLICT_FOLDER_ID } = require('lib/reserved-ids');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000 + 30000; // The first test is slow because the database needs to be built

async function extractLocalDb(clientId = null, doSort = true) {
	const restoreClientId = currentClientId();
	if (clientId) await switchClient(clientId);
	const folders = await Folder.all({ includeTrash: true });
	const notes = await Note.all({ includeTrash: true });
	const tags = await Tag.all({ includeTrash: true });
	const note_tags = await NoteTag.all();
	if (clientId) await switchClient(restoreClientId);

	let allItems = folders.concat(notes).concat(tags).concat(note_tags);
	if (doSort) allItems = allItems.sort(byIds);
	return allItems;
}

async function extractSyncTarget_(types, doSort = true) {
	const list = await fileApi().list();
	if (list.has_more) throw new Error('Not implemented!!!');
	const files = list.items;

	let output = [];
	for (const file of files) {
		const remoteContent = await fileApi().get(file.path);
		const content = await BaseItem.unserialize(remoteContent);
		if (types.indexOf(content.type_) < 0) continue;
		output.push(content);
	}
	if (doSort) output = output.sort(byIds);
	return output;
}

async function extractSyncTarget() {
	return extractSyncTarget_([BaseModel.TYPE_NOTE, BaseModel.TYPE_FOLDER, BaseModel.TYPE_TAG, BaseModel.TYPE_NOTE_TAG]);
}

function excludeConflictFields(item, field = null) {
	const out = Object.assign({}, item);
	for (const f of ['id', 'is_conflict']) {
		if (f in out) delete out[f];
	}
	if (!!field && field in out) delete out[field];
	return out;
}

function excludeConflicts(items) {
	let out = items.slice(0);
	out = out.filter(item => !('is_conflict' in item) || item.is_conflict === 0);
	return out;
}

function excludeTrashTag(items) {
	let out = items.slice(0);
	out = out.filter(item => item.id !== TRASH_TAG_ID);
	return out;
}

function cleanupTagLinks(items) {
	const out = items.slice(0);
	const noteIds = ids(out.filter(a => a.type_ == 1));
	for (let i = out.length - 1; i >= 0; i--) {
		if (out[i].type_ !== 6) continue;
		if (noteIds.includes(out[i].note_id)) continue;
		out.splice(i, 1);
	}
	return out;
}

function ignoreTrashTagTimes(items) {
	const out = items.slice(0);
	const fields = ['created_time', 'updated_time', 'user_created_time', 'user_updated_time'];
	for (let i = 0; i < items.length; i++) {
		if (out[i].id !== TRASH_TAG_ID) continue;
		for (const f of fields) {
			if (f in out[i]) out[i][f] = 0;
		}
	}
	return out;
}

function excludeGeolocationFields(items) {
	const out = items.slice(0);
	const fields = ['latitude', 'longitude', 'altitude'];
	for (let i = 0; i < items.length; i++) {
		for (const f of fields) {
			if (f in out[i]) out[i][f] = 0;
		}
	}
	return out;
}

function trashTagExists(items) {
	for (let i = 0; i < items.length; i++) {
		if (items[i].type_ !== 5) continue;
		if (items[i].id !== TRASH_TAG_ID) continue;
		if (items[i].title === TRASH_TAG_NAME) return true;
	}
	return false;
}

function byIds(a, b) {
	if (a.id > b.id) return +1;
	if (a.id < b.id) return -1;
	return 0;
}

async function compareToSyncTarget(db, expect) {
	const syncTarget = await extractSyncTarget();

	expect(db.length).toEqual(syncTarget.length);
	expect(ids(db)).toEqual(ids(syncTarget));
	expect(db).toEqual(syncTarget);
}

let insideBeforeEach = false;

describe('SynchronizerAndTrash', function() {

	beforeEach(async (done) => {
		insideBeforeEach = true;

		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
		done();

		insideBeforeEach = false;
	});

	it('should create sync target items - with trash', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		const folder = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		const note = await Note.save({ title: 'un', parent_id: folder.id });
		await time.msleep(5);
		await Tag.setNoteTagsByIds(note.id, [TRASH_TAG_ID]);
		await time.msleep(5);
		const client1 = await extractLocalDb();
		await synchronizer().start();

		await compareToSyncTarget(excludeTrashTag(client1), expect);
	}));

	it('should update sync target items - in/out of trash', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		const folder = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		const note1 = await Note.save({ title: 'un', parent_id: folder.id });
		await time.msleep(5);
		const note2 = await Note.save({ title: 'du', parent_id: folder.id });
		await time.msleep(5);
		const note3 = await Note.save({ title: 'tr', parent_id: folder.id });
		await time.msleep(5);
		await Tag.setNoteTagsByIds(note2.id, [TRASH_TAG_ID]);
		await time.msleep(5);
		await synchronizer().start();

		await Note.undelete([note2.id]);
		await time.msleep(5);
		await Note.batchDelete([note3.id], { permanent: false });
		await time.msleep(5);
		const client1 = await extractLocalDb();
		await synchronizer().start();

		await compareToSyncTarget(excludeTrashTag(client1), expect);
	}));

	// A create note in trash -> ST
	// B sync
	// = note is in trash
	it('should create items in the trash', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		const folder = await Folder.save({ title: 'folder' });
		await time.msleep(5);
		const note = await Note.save({ title: 'un', parent_id: folder.id });
		await time.msleep(5);
		await Tag.setNoteTagsByIds(note.id, [TRASH_TAG_ID]);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await time.msleep(5);
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		const tag = await Tag.load(TRASH_TAG_ID);
		expect(!!tag).toBe(true);
		const noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note.id]);

		const client1 = await extractLocalDb(1);
		const client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A move note to trash -> ST
	// B sync
	// = note is in trash
	it('should move note to trash', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		const note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await synchronizer().start();
		const note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		expect(note.id).toEqual(note1.id);
		const tag = await Tag.load(TRASH_TAG_ID);
		expect(!!tag).toBe(true);
		const noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(!!noteIds && noteIds.length === 1).toBe(true);
		expect(noteIds).toEqual([note1.id]);
		const conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		const client1 = await extractLocalDb(1);
		const client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		await compareToSyncTarget(excludeTrashTag(client1), expect);
		await compareToSyncTarget(excludeTrashTag(client2), expect);
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A move restore note from trash -> ST
	// B sync
	// = note is in trash
	it('should restore note from trash', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		const note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		await Tag.setNoteTagsByIds(note1.id, [TRASH_TAG_ID]);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		const note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		expect(note.id).toEqual(note1.id);
		const tag = await Tag.load(TRASH_TAG_ID);
		expect(!!tag).toBe(true);
		const noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(!!noteIds && noteIds.length === 1).toBe(true);
		expect(noteIds).toEqual([note1.id]);
		const conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		const client1 = await extractLocalDb(1);
		const client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		await compareToSyncTarget(excludeTrashTag(client1), expect);
		await compareToSyncTarget(excludeTrashTag(client2), expect);
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// This is not an expected scenario (editing note while in trash) but tested anyway
	// A create note in trash -> ST
	// B sync
	// A edit note -> ST
	// B edit note
	// B sync
	// = B note in conflict, A note exists in trash -> ST
	// A sync
	// = A note exists in trash, no conflict
	it('should handle note conflicts on notes in trash (1)', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		note1 = await Note.load(note1.id);
		await time.msleep(5);
		await Tag.setNoteTagsByIds(note1.id, [TRASH_TAG_ID]);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		let note1_local = await Note.load(note1.id);
		note1_local.title = 'Updated on client 1';
		await time.msleep(5);
		await Note.save(note1_local);
		note1_local = await Note.load(note1.id);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		let note1_remote = await Note.load(note1.id);
		note1_remote.title = 'Updated on client 2';
		await time.msleep(5);
		await Note.save(note1_remote);
		note1_remote = await Note.load(note1.id);
		await time.msleep(5);
		await synchronizer().start();

		let conflicts = await Note.conflictedNotes(); // note is in conflict
		expect(conflicts.length).toBe(1);
		const conflict = conflicts[0];
		expect(conflict.id == note1.id).toBe(false);
		expect(excludeConflictFields(conflict)).toEqual(excludeConflictFields(note1_remote));

		note1_remote = await Note.load(note1.id);
		expect(note1_remote).toEqual(note1_local); // note is updated to match the other client

		let noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(!!noteIds && noteIds.length === 1).toBe(true);
		expect(noteIds).toEqual([note1.id]);

		await synchronizer().start();

		await switchClient(1); // local

		await synchronizer().start();
		const note = await Note.load(note1.id);
		expect(note).toEqual(note1_local); // note is unchanged as conflict is on other client
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(!!noteIds && noteIds.length === 1).toBe(true);
		expect(noteIds).toEqual([note1.id]);

		const client1 = await extractLocalDb(1);
		const client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(excludeConflicts(ignoreTrashTagTimes(client2)));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// This is not an expected scenario (editing note while in trash) but tested anyway
	// Same test exactly as previous but the time order of who edited is swapped
	// The result should be exactly the same regardless.
	// A create note in trash -> ST
	// B sync
	// B edit note
	// A edit note -> ST
	// B sync
	// = B note in conflict, A note exists -> ST
	// A sync
	// = A note exists, no conflict
	it('should handle note conflicts on notes in trash (2)', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		note1 = await Note.load(note1.id);
		await time.msleep(5);
		await Tag.setNoteTagsByIds(note1.id, [TRASH_TAG_ID]);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		let note1_remote = await Note.load(note1.id);
		note1_remote.title = 'Updated on client 2';
		await time.msleep(5);
		await Note.save(note1_remote);
		note1_remote = await Note.load(note1.id);
		await time.msleep(5);

		await switchClient(1); // local

		let note1_local = await Note.load(note1.id);
		note1_local.title = 'Updated on client 1';
		await time.msleep(5);
		await Note.save(note1_local);
		note1_local = await Note.load(note1.id);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await synchronizer().start();

		let conflicts = await Note.conflictedNotes(); // note is in conflict
		expect(conflicts.length).toBe(1);
		const conflict = conflicts[0];
		expect(conflict.id == note1.id).toBe(false);

		expect(excludeConflictFields(conflict)).toEqual(excludeConflictFields(note1_remote));
		note1_remote = await Note.load(note1.id);
		expect(note1_remote).toEqual(note1_local); // note is updated to match foreign
		await synchronizer().start();

		await switchClient(1); // local

		await synchronizer().start();
		const note = await Note.load(note1.id);
		expect(note).toEqual(note1_local); // note is unchanged as conflict is on other client
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);
		const noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(!!noteIds && noteIds.length === 1).toBe(true);
		expect(noteIds).toEqual([note1.id]);

		const client1 = await extractLocalDb(1);
		const client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(excludeConflicts(ignoreTrashTagTimes(client2)));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A deletes from trash -> ST
	// B does nothing
	// B sync
	// = note gone
	it('should handle remote deletion from trash', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		note1 = await Note.load(note1.id);
		await time.msleep(5);
		await Tag.setNoteTagsByIds(note1.id, [TRASH_TAG_ID]);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local
		Note.delete(note1.id);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await synchronizer().start();
		const conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);
		const note = await Note.load(note1.id);
		expect(!note).toBe(true);

		const client2 = await extractLocalDb(2);
		const client1 = await extractLocalDb(1);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A move to trash -> ST
	// B delete
	// B sync
	// = note is deleted and not in conflict -> ST
	// A sync
	// = note is deleted and not in conflict
	it('should handle simultaneous move to trash and delete', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		note1 = await Note.load(note1.id);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Note.delete(note1.id);
		await time.msleep(5);

		await synchronizer().start();
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);
		let note = await Note.load(note1.id);
		expect(!note).toBe(true);

		await switchClient(1); // local

		await synchronizer().start();
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);
		note = await Note.load(note1.id);
		expect(!note).toBe(true);

		const client2 = await extractLocalDb(2);
		const client1 = await extractLocalDb(1);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A restore from trash -> ST
	// B delete from trash
	// B sync
	// = note gone -> ST
	// A sync
	// = note gone
	it('should handle simultaneous restore from trash and delete', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		await Tag.setNoteTagsByIds(note1.id, [TRASH_TAG_ID]);
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await Note.undelete([note1.id]);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Note.delete(note1.id);
		await time.msleep(5);

		await synchronizer().start();
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);
		let note = await Note.load(note1.id);
		expect(!note).toBe(true);

		await switchClient(1); // local

		await synchronizer().start();
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);
		note = await Note.load(note1.id);
		expect(!note).toBe(true);

		const client2 = await extractLocalDb(2);
		const client1 = await extractLocalDb(1);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A delete note -> ST
	// B move to trash
	// B sync
	// = note gone and no conflicts
	it('should handle simultaneous delete and move to trash', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await Note.delete(note1.id);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);

		await synchronizer().start();
		let note = await Note.load(note1.id);
		expect(!note).toBe(true);
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		let client1 = await extractLocalDb(1);
		let client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(cleanupTagLinks(ignoreTrashTagTimes(client2)));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);

		await switchClient(1); // local

		await synchronizer().start();
		note = await Note.load(note1.id);
		expect(!note).toBe(true);
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		client1 = await extractLocalDb(1);
		client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A delete note -> ST
	// B restore from trash
	// B sync
	// = note gone and no conflicts
	it('should handle simultaneous delete and restore note from trash', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		await Tag.setNoteTagsByIds(note1.id, [TRASH_TAG_ID]);
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await Note.delete(note1.id);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Note.undelete([note1.id]);
		await time.msleep(5);

		await synchronizer().start();
		let note = await Note.load(note1.id);
		expect(!note).toBe(true);
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		let client1 = await extractLocalDb(1);
		let client2 = await extractLocalDb(2);
		expect(cleanupTagLinks(ignoreTrashTagTimes(client1))).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);

		await switchClient(1); // local

		await synchronizer().start();
		note = await Note.load(note1.id);
		expect(!note).toBe(true);
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		client1 = await extractLocalDb(1);
		client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A move to trash -> ST
	// B move to trash
	// B sync
	// = note in trash (with both links!) (is this what should happen?)
	it('should handle simultaneous move to trash', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);

		await synchronizer().start();
		let note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		let noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(2); // though it's the same link!
		expect(noteIds).toEqual([note1.id, note1.id]);
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		await switchClient(1); // local

		await synchronizer().start();
		note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(2);
		expect(noteIds).toEqual([note1.id, note1.id]);
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		const client1 = await extractLocalDb(1);
		const client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A restore from trash -> ST
	// B restore from trash
	// B sync
	// = note restored
	it('should handle simultaneous restore from trash', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		await Tag.setNoteTagsByIds(note1.id, [TRASH_TAG_ID]);
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await Note.undelete([note1.id]);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Note.undelete([note1.id]);
		await time.msleep(5);

		await synchronizer().start();
		let note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		let noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(0);
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		let client1 = await extractLocalDb(1);
		let client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);

		await switchClient(1); // local

		await synchronizer().start();
		note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(0);
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		client1 = await extractLocalDb(1);
		client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A restore from trash -> ST
	// A move to trash -> ST
	// B restore from trash
	// B sync
	// = note is in trash, no conflict (should it be in trash?)
	it('should handle simultaneous cancellation and restore from trash', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		await Tag.setNoteTagsByIds(note1.id, [TRASH_TAG_ID]);
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await Note.undelete([note1.id]);
		await time.msleep(5);
		await synchronizer().start();

		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Note.undelete([note1.id]);
		await time.msleep(5);

		await synchronizer().start();

		let note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		let noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		let client1 = await extractLocalDb(1);
		let client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);

		await switchClient(1); // local

		await synchronizer().start();
		note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		client1 = await extractLocalDb(1);
		client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A restore from trash
	// A move to trash -> ST
	// B restore from trash
	// B sync
	// = note in trash (should it be in trash?)
	it('should handle simultaneous cancellation and restore from trash (2)', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		await Tag.setNoteTagsByIds(note1.id, [TRASH_TAG_ID]);
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await Note.undelete([note1.id]);
		await time.msleep(5);
		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Note.undelete([note1.id]);
		await time.msleep(5);

		await synchronizer().start();

		let note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		let noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		let client1 = await extractLocalDb(1);
		let client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);

		await switchClient(1); // local

		await synchronizer().start();
		note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		client1 = await extractLocalDb(1);
		client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A move to trash -> ST
	// A restore from trash -> ST
	// B move to trash
	// B sync
	// = note in trash -> ST
	// A sync
	// = note in trash
	it('should handle simultaneous cancellation and move to trash', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);
		await synchronizer().start();

		await Note.undelete([note1.id]);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);

		await synchronizer().start();

		let note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		let noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		await switchClient(1); // local

		await synchronizer().start();
		note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		const client1 = await extractLocalDb(1);
		const client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A restore from trash -> ST
	// B restore from trash
	// B move to trash
	// B sync
	// = note in trash -> ST
	// A sync
	// = note in trash
	it('should handle simultaneous cancellation and move to trash', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await Tag.setNoteTagsByIds(note1.id, [TRASH_TAG_ID]);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await Note.undelete([note1.id]);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Note.undelete([note1.id]);
		await time.msleep(5);
		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);

		await synchronizer().start();

		let note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		let noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		await switchClient(1); // local

		await synchronizer().start();
		note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		const client1 = await extractLocalDb(1);
		const client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A move to trash -> ST
	// B move to trash
	// B restore from trash
	// B sync
	// = note in trash
	it('should handle simultaneous move to trash and cancellation', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);
		await Note.undelete([note1.id]);
		await time.msleep(5);

		await synchronizer().start();

		let note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		let noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		let client1 = await extractLocalDb(1);
		let client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);

		await switchClient(1); // local

		await synchronizer().start();
		note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		client1 = await extractLocalDb(1);
		client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A edit note -> ST
	// A move to trash -> ST
	// B (nothing)
	// B sync
	// = A note with edit in trash
	it('should handle two syncs in one go', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await time.msleep(5);
		const note1_updated = await Note.load(note1.id);
		note1_updated.title = 'Updated on client 1';
		await time.msleep(5);
		await Note.save(note1_updated);
		await time.msleep(5);
		await synchronizer().start();
		await time.msleep(5);
		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await time.msleep(5);
		await synchronizer().start();

		let note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		expect(note.title).toEqual(note1_updated.title);
		let noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		let client1 = await extractLocalDb(1);
		let client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);

		await switchClient(1); // local

		await synchronizer().start();
		note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		expect(note.title).toEqual(note1_updated.title);
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		client1 = await extractLocalDb(1);
		client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A restore note from trash -> ST
	// B edit note
	// B delete note
	// B sync
	// = note gone and no conflicts -> ST
	// A sync
	// = note gone and no conflicts
	it('should handle simultaneous restore and edit+delete', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		await Tag.setNoteTagsByIds(note1.id, [TRASH_TAG_ID]);
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await Note.undelete([note1.id]);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await time.msleep(5);
		const note1_updated = await Note.load(note1.id);
		note1_updated.title = 'Updated on client 1';
		await time.msleep(5);
		await Note.save(note1_updated);
		await time.msleep(5);
		await Note.delete(note1.id);
		await time.msleep(5);
		await synchronizer().start();

		let note = await Note.load(note1.id);
		expect(!note).toBe(true);
		let noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(0);
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		await switchClient(1); // local

		await synchronizer().start();
		note = await Note.load(note1.id);
		expect(!note).toBe(true);
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(0);
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		const client1 = await extractLocalDb(1);
		const client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A move to trash -> ST
	// B edit note
	// B sync
	// = edited note in trash, no conflicts -> ST
	// A sync
	// = edited note in trash
	it('should handle simultaneous move to trash and edit', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await time.msleep(5);
		const note1_updated = await Note.load(note1.id);
		note1_updated.title = 'Updated on client 2';
		await time.msleep(5);
		await Note.save(note1_updated);
		await time.msleep(5);
		await synchronizer().start();

		let note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		expect(note.title).toEqual(note1_updated.title);
		let noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		await switchClient(1); // local

		await synchronizer().start();
		note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		expect(note.title).toEqual(note1_updated.title);
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		const client1 = await extractLocalDb(1);
		const client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A edits note -> ST
	// B move to trash
	// B sync
	// = edited note in trash, no conflicts -> ST
	// A sync
	// = edited note in trash, no conflicts
	it('should handle simultaneous edit and move to trash', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await time.msleep(5);
		const note1_updated = await Note.load(note1.id);
		note1_updated.title = 'Updated on client 1';
		await time.msleep(5);
		await Note.save(note1_updated);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);
		await synchronizer().start();

		let note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		expect(note.title).toEqual(note1_updated.title);
		let noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		await switchClient(1); // local

		await synchronizer().start();
		note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		expect(note.title).toEqual(note1_updated.title);
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		const client1 = await extractLocalDb(1);
		const client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));


	// Duplicate note_tag test: Simultaneously applying a tag on both clients
	// results in two note_tag entries for the link the note and tag. This test
	// does further testing to ensure we can handle this duplication.
	//
	// Here we test that we can successfully restore from trash (untag the note).
	it('should handle restore from trash for item with duplicate trash tags', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await synchronizer().start();

		// actual test starts here
		await time.msleep(5);
		await Note.undelete([note1.id]);
		await time.msleep(5);

		let note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		let noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(0); // both links should be gone
		let noteTags = await NoteTag.byNoteIds([note1.id]);
		expect(noteTags.length).toEqual(0); // check its really gone
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);
		await synchronizer().start();

		await switchClient(2); // remote

		await synchronizer().start();
		note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(0);
		noteTags = await NoteTag.byNoteIds([note1.id]);
		expect(noteTags.length).toEqual(0);
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		const client1 = await extractLocalDb(1);
		const client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// Duplicate note_tag test: Simulataneously applying a tag on both clients
	// results in two note_tag entries for the link the note and tag. This test
	// does further testing to ensure we can handle this duplication.
	//
	// Here we test that we can successfully delete the note from trash.
	it('should handle delete from trash for item with duplicate trash tags', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await synchronizer().start();
		// actual test starts here
		await time.msleep(5);
		await Note.delete(note1.id);
		await time.msleep(5);

		let note = await Note.load(note1.id);
		expect(!note).toBe(true);
		const noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(0); // both links should be unreported
		let noteTags = await NoteTag.byNoteIds([note1.id]);
		expect(noteTags.length).toEqual(2); // check they exist dangling (not required, just expected)
		expect(noteTags[0].note_id).toEqual(note1.id);
		expect(noteTags[1].note_id).toEqual(note1.id);
		expect(noteTags[0].tag_id).toEqual(TRASH_TAG_ID);
		expect(noteTags[1].tag_id).toEqual(TRASH_TAG_ID);
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);
		await synchronizer().start();

		await switchClient(2); // remote

		await synchronizer().start();
		note = await Note.load(note1.id);
		expect(!note).toBe(true);
		expect(noteIds.length).toEqual(0);
		noteTags = await NoteTag.byNoteIds([note1.id]);
		expect(noteTags.length).toEqual(2);
		expect(noteTags[0].note_id).toEqual(note1.id);
		expect(noteTags[1].note_id).toEqual(note1.id);
		expect(noteTags[0].tag_id).toEqual(TRASH_TAG_ID);
		expect(noteTags[1].tag_id).toEqual(TRASH_TAG_ID);
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		const client1 = await extractLocalDb(1);
		const client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// This test is for an exceptional situation where the trash tag is deleted.
	// This is never expected to happen however we test it anyway.
	//
	// A move to trash -> ST
	// B delete trash tag [never expected to happen, by design]
	// B sync
	// = note in trash, trash tag gone... -> ST
	// A sync
	// = note in trash, trash tag remains, no conflicts
	// B recreate trash tag [simulate restart] [TBD move another to trash on B]
	// B sync
	// = note in trash, trash tag exists
	it('should handle simultaneous edit and move to trash', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await time.msleep(5);
		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.delete(TRASH_TAG_ID, { forceDeleteTrashTag: true });
		let tag = await Tag.load(TRASH_TAG_ID);
		expect(!tag).toBe(true);
		tag = await Tag.loadByTitle(TRASH_TAG_NAME);
		expect(!tag).toBe(true);
		await time.msleep(5);
		await synchronizer().start();

		tag = await Tag.load(TRASH_TAG_ID);
		expect(!tag).toBe(true);
		let note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		let noteIds = await Tag.noteIds(TRASH_TAG_ID); // this exists though the tag doesn't
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		await switchClient(1); // local

		await synchronizer().start();
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		expect(noteIds).toEqual([note1.id]);
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		let client1 = await extractLocalDb(1);
		let client2 = await extractLocalDb(2);
		expect(excludeTrashTag(client1)).toEqual(excludeTrashTag(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(false);

		// simulate recovery - restart recreates trash tag

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);

		client1 = await extractLocalDb(1);
		client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		await synchronizer().start();

		await switchClient(1); // local

		await synchronizer().start();
		client1 = await extractLocalDb(1);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
	}));

	// This test is for an exceptional situation where the trash tag is deleted.
	// This is never expected to happen however we test it anyway.
	// Same as above (1) but client actions are reversed.
	//
	// A delete trash tag -> ST [never expected to happen, by design]
	// B move to trash
	// B sync
	// = note in trash, trash tag exists, no conflicts -> ST
	// A sync
	// = note in trash, trash tag gone, no conflicts
	// A recreate trash tag [simulate restart]
	// A sync
	// = note in trash, trash tag exists, no conflicts
	it('should handle simultaneous edit and move to trash (2)', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await Tag.delete(TRASH_TAG_ID, { forceDeleteTrashTag: true });
		let tag = await Tag.load(TRASH_TAG_ID);
		expect(!tag).toBe(true);
		tag = await Tag.loadByTitle(TRASH_TAG_NAME);
		expect(!tag).toBe(true);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await time.msleep(5);
		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);
		await synchronizer().start();

		tag = await Tag.load(TRASH_TAG_ID);
		expect(!!tag).toBe(true);
		let note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		let noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		await switchClient(1); // local

		await synchronizer().start();
		tag = await Tag.load(TRASH_TAG_ID);
		expect(!tag).toBe(true);
		note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1); // link exists though tag doesn't
		expect(noteIds).toEqual([note1.id]);
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		let client1 = await extractLocalDb(1);
		let client2 = await extractLocalDb(2);
		expect(excludeTrashTag(client1)).toEqual(excludeTrashTag(client2));
		expect(trashTagExists(client1)).toBe(false);
		expect(trashTagExists(client2)).toBe(true);

		// simulate recovery - restart recreates trash tag

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);

		client1 = await extractLocalDb(1);
		client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		await synchronizer().start();

		await switchClient(2); // remote

		await synchronizer().start();
		client1 = await extractLocalDb(1);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
	}));

	// This test is for an exceptional situation where the trash tag is deleted.
	// This is never expected to happen however we test it anyway.
	//
	// Same as above scenario (1), but check behaviour and recovery if more notes
	// are moved to trash while trash tag is deleted.
	it('should handle simultaneous edit and move to trash (3)', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await time.msleep(5);
		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.delete(TRASH_TAG_ID, { forceDeleteTrashTag: true });
		await time.msleep(5);
		await synchronizer().start();

		// actual test starts here
		let note2 = await Note.save({ title: 'to', parent_id: folder1.id });
		await time.msleep(5);
		note2 = await Note.load(note2.id);
		await time.msleep(5);
		const hasThrown = await checkThrowAsync(
			async () => await Note.batchDelete([note2.id], { permanent: false }));
		expect(hasThrown).toBe(true);

		let tag = await Tag.load(TRASH_TAG_ID);
		expect(!tag).toBe(true);
		tag = await Tag.loadByTitle(TRASH_TAG_NAME);
		expect(!tag).toBe(true);
		let note = await Note.load(note2.id);
		expect(!!note).toBe(true);
		let noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds.sort()).toEqual(sortedIds([note1]));
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		// simulate restart
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		tag = await Tag.load(TRASH_TAG_ID);
		expect(!!tag).toBe(true);

		await await Note.batchDelete([note2.id], { permanent: false });
		tag = await Tag.load(TRASH_TAG_ID);
		expect(!!tag).toBe(true);
		tag = await Tag.loadByTitle(TRASH_TAG_NAME);
		expect(!!tag).toBe(true);
		expect(tag.id).toBe(TRASH_TAG_ID);
		note = await Note.load(note2.id);
		expect(!!note).toBe(true);
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(2);
		expect(noteIds.sort()).toEqual(sortedIds([note1, note2]));
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		await synchronizer().start();

		await switchClient(1); // local

		await synchronizer().start();

		const client1 = await extractLocalDb(1);
		const client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A tags note -> ST
	// B move to trash
	// B sync
	// = edited note in trash with tag, no conflicts -> ST
	// A sync
	// = edited note in trash with tag, no conflicts
	it('should handle simultaneous tag and move to trash', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await time.msleep(5);
		await Tag.addNoteTagByTitle(note1.id, 'tagen');
		const tagen = await Tag.loadByTitle('tagen');
		expect(!!tagen).toBe(true);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);
		await synchronizer().start();

		let note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		let noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		noteIds = await Tag.noteIds(tagen.id);
		expect(noteIds.length).toEqual(0); // note is in trash so this tag is unreported
		let tagIds = await NoteTag.tagIdsByNoteId(note1.id);
		expect(tagIds.length).toEqual(2);
		expect(tagIds.sort()).toEqual([TRASH_TAG_ID, tagen.id].sort());
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		await switchClient(1); // local

		await synchronizer().start();
		note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		noteIds = await Tag.noteIds(tagen.id);
		expect(noteIds.length).toEqual(0); // note is in trash so this tag is unreported
		tagIds = await NoteTag.tagIdsByNoteId(note1.id);
		expect(tagIds.length).toEqual(2);
		expect(tagIds.sort()).toEqual([TRASH_TAG_ID, tagen.id].sort());
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		const client1 = await extractLocalDb(1);
		const client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A move to trash -> ST
	// B tags note
	// B sync
	// = edited note in trash with tag, no conflicts -> ST
	// A sync
	// = edited note in trash with tag, no conflicts
	it('should handle simultaneous tag and move to trash (2)', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await Note.batchDelete([note1.id], { permanent: false });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await time.msleep(5);
		await Tag.addNoteTagByTitle(note1.id, 'tagen');
		const tagen = await Tag.loadByTitle('tagen');
		expect(!!tagen).toBe(true);
		await time.msleep(5);
		await synchronizer().start();

		let note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		let noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		noteIds = await Tag.noteIds(tagen.id);
		expect(noteIds.length).toEqual(0); // note is in trash so this tag is unreported
		let tagIds = await NoteTag.tagIdsByNoteId(note1.id);
		expect(tagIds.length).toEqual(2);
		expect(tagIds.sort()).toEqual([TRASH_TAG_ID, tagen.id].sort());
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		await switchClient(1); // local

		await synchronizer().start();
		note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(1);
		expect(noteIds).toEqual([note1.id]);
		noteIds = await Tag.noteIds(tagen.id);
		expect(noteIds.length).toEqual(0); // note is in trash so this tag is unreported
		tagIds = await NoteTag.tagIdsByNoteId(note1.id);
		expect(tagIds.length).toEqual(2);
		expect(tagIds.sort()).toEqual([TRASH_TAG_ID, tagen.id].sort());
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		const client1 = await extractLocalDb(1);
		const client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A tags note -> ST
	// B restore from trash
	// B sync
	// = edited note not in trash with tag, no conflicts -> ST
	// A sync
	// = edited note not in trash with tag, no conflicts
	it('should handle simultaneous tag and restore from trash', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		await Tag.setNoteTagsByIds(note1.id, [TRASH_TAG_ID]);
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await time.msleep(5);
		await Tag.addNoteTagByTitle(note1.id, 'tagen');
		const tagen = await Tag.loadByTitle('tagen');
		expect(!!tagen).toBe(true);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await Note.undelete([note1.id]);
		await time.msleep(5);
		await synchronizer().start();

		let note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		let noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(0);
		noteIds = await Tag.noteIds(tagen.id);
		expect(noteIds.length).toEqual(1);
		expect(noteIds[0]).toEqual(note1.id);
		let tagIds = await NoteTag.tagIdsByNoteId(note1.id);
		expect(tagIds.length).toEqual(1);
		expect(tagIds.sort()).toEqual([tagen.id].sort());
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		await switchClient(1); // local

		await synchronizer().start();
		note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(0);
		noteIds = await Tag.noteIds(tagen.id);
		expect(noteIds.length).toEqual(1);
		expect(noteIds[0]).toEqual(note1.id);
		tagIds = await NoteTag.tagIdsByNoteId(note1.id);
		expect(tagIds.length).toEqual(1);
		expect(tagIds.sort()).toEqual([tagen.id].sort());
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		const client1 = await extractLocalDb(1);
		const client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));

	// A restore from trash -> ST
	// B tags note
	// B sync
	// = edited note not in trash with tag, no conflicts -> ST
	// A sync
	// = edited note not in trash with tag, no conflicts
	it('should handle simultaneous tag and restore from trash (2)', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		await time.msleep(5);
		let note1 = await Note.save({ title: 'un', parent_id: folder1.id });
		await time.msleep(5);
		await Tag.setNoteTagsByIds(note1.id, [TRASH_TAG_ID]);
		await time.msleep(5);
		note1 = await Note.load(note1.id);
		await synchronizer().start();

		await switchClient(2); // remote

		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(1); // local

		await Note.undelete([note1.id]);
		await time.msleep(5);
		await synchronizer().start();

		await switchClient(2); // remote

		await time.msleep(5);
		await Tag.addNoteTagByTitle(note1.id, 'tagen');
		const tagen = await Tag.loadByTitle('tagen');
		expect(!!tagen).toBe(true);
		await time.msleep(5);
		await synchronizer().start();

		let note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		let noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(0);
		noteIds = await Tag.noteIds(tagen.id);
		expect(noteIds.length).toEqual(1);
		expect(noteIds[0]).toEqual(note1.id);
		let tagIds = await NoteTag.tagIdsByNoteId(note1.id);
		expect(tagIds.length).toEqual(1);
		expect(tagIds.sort()).toEqual([tagen.id].sort());
		let conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		await switchClient(1); // local

		await synchronizer().start();
		note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.length).toEqual(0);
		noteIds = await Tag.noteIds(tagen.id);
		expect(noteIds.length).toEqual(1);
		expect(noteIds[0]).toEqual(note1.id);
		tagIds = await NoteTag.tagIdsByNoteId(note1.id);
		expect(tagIds.length).toEqual(1);
		expect(tagIds.sort()).toEqual([tagen.id].sort());
		conflicts = await Note.conflictedNotes();
		expect(conflicts.length).toBe(0);

		const client1 = await extractLocalDb(1);
		const client2 = await extractLocalDb(2);
		expect(ignoreTrashTagTimes(client1)).toEqual(ignoreTrashTagTimes(client2));
		expect(trashTagExists(client1)).toBe(true);
		expect(trashTagExists(client2)).toBe(true);
	}));
});
