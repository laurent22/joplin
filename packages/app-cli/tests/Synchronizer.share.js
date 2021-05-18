'use strict';
const __awaiter = (this && this.__awaiter) || function(thisArg, _arguments, P, generator) {
	function adopt(value) { return value instanceof P ? value : new P(function(resolve) { resolve(value); }); }
	return new (P || (P = Promise))(function(resolve, reject) {
		function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
		function rejected(value) { try { step(generator['throw'](value)); } catch (e) { reject(e); } }
		function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
		step((generator = generator.apply(thisArg, _arguments || [])).next());
	});
};
Object.defineProperty(exports, '__esModule', { value: true });
const Setting_1 = require('@joplin/lib/models/Setting');
const test_utils_synchronizer_1 = require('./test-utils-synchronizer');
const { syncTargetName, afterAllCleanUp, synchronizerStart, setupDatabaseAndSynchronizer, synchronizer, sleep, switchClient, syncTargetId, fileApi } = require('./test-utils.js');
const Folder_1 = require('@joplin/lib/models/Folder');
const Note_1 = require('@joplin/lib/models/Note');
const BaseItem_1 = require('@joplin/lib/models/BaseItem');
const WelcomeUtils = require('@joplin/lib/WelcomeUtils');
describe('Synchronizer.basics', function() {
	beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
		yield setupDatabaseAndSynchronizer(1);
		yield setupDatabaseAndSynchronizer(2);
		yield switchClient(1);
		done();
	}));
	afterAll(() => __awaiter(this, void 0, void 0, function* () {
		yield afterAllCleanUp();
	}));
	it('should create remote items', (() => __awaiter(this, void 0, void 0, function* () {
		const folder = yield Folder_1.default.save({ title: 'folder1' });
		yield Note_1.default.save({ title: 'un', parent_id: folder.id });
		const all = yield test_utils_synchronizer_1.allNotesFolders();
		yield synchronizerStart();
		yield test_utils_synchronizer_1.localNotesFoldersSameAsRemote(all, expect);
	})));
	it('should update remote items', (() => __awaiter(this, void 0, void 0, function* () {
		const folder = yield Folder_1.default.save({ title: 'folder1' });
		const note = yield Note_1.default.save({ title: 'un', parent_id: folder.id });
		yield synchronizerStart();
		yield Note_1.default.save({ title: 'un UPDATE', id: note.id });
		const all = yield test_utils_synchronizer_1.allNotesFolders();
		yield synchronizerStart();
		yield test_utils_synchronizer_1.localNotesFoldersSameAsRemote(all, expect);
	})));
	it('should create local items', (() => __awaiter(this, void 0, void 0, function* () {
		const folder = yield Folder_1.default.save({ title: 'folder1' });
		yield Note_1.default.save({ title: 'un', parent_id: folder.id });
		yield synchronizerStart();
		yield switchClient(2);
		yield synchronizerStart();
		const all = yield test_utils_synchronizer_1.allNotesFolders();
		yield test_utils_synchronizer_1.localNotesFoldersSameAsRemote(all, expect);
	})));
	it('should update local items', (() => __awaiter(this, void 0, void 0, function* () {
		const folder1 = yield Folder_1.default.save({ title: 'folder1' });
		const note1 = yield Note_1.default.save({ title: 'un', parent_id: folder1.id });
		yield synchronizerStart();
		yield switchClient(2);
		yield synchronizerStart();
		yield sleep(0.1);
		let note2 = yield Note_1.default.load(note1.id);
		note2.title = 'Updated on client 2';
		yield Note_1.default.save(note2);
		note2 = yield Note_1.default.load(note2.id);
		yield synchronizerStart();
		yield switchClient(1);
		yield synchronizerStart();
		const all = yield test_utils_synchronizer_1.allNotesFolders();
		yield test_utils_synchronizer_1.localNotesFoldersSameAsRemote(all, expect);
	})));
	it('should delete remote notes', (() => __awaiter(this, void 0, void 0, function* () {
		const folder1 = yield Folder_1.default.save({ title: 'folder1' });
		const note1 = yield Note_1.default.save({ title: 'un', parent_id: folder1.id });
		yield synchronizerStart();
		yield switchClient(2);
		yield synchronizerStart();
		yield sleep(0.1);
		yield Note_1.default.delete(note1.id);
		yield synchronizerStart();
		const remotes = yield test_utils_synchronizer_1.remoteNotesAndFolders();
		expect(remotes.length).toBe(1);
		expect(remotes[0].id).toBe(folder1.id);
		const deletedItems = yield BaseItem_1.default.deletedItems(syncTargetId());
		expect(deletedItems.length).toBe(0);
	})));
	it('should not created deleted_items entries for items deleted via sync', (() => __awaiter(this, void 0, void 0, function* () {
		const folder1 = yield Folder_1.default.save({ title: 'folder1' });
		yield Note_1.default.save({ title: 'un', parent_id: folder1.id });
		yield synchronizerStart();
		yield switchClient(2);
		yield synchronizerStart();
		yield Folder_1.default.delete(folder1.id);
		yield synchronizerStart();
		yield switchClient(1);
		yield synchronizerStart();
		const deletedItems = yield BaseItem_1.default.deletedItems(syncTargetId());
		expect(deletedItems.length).toBe(0);
	})));
	it('should delete local notes', (() => __awaiter(this, void 0, void 0, function* () {
		const folder1 = yield Folder_1.default.save({ title: 'folder1' });
		const note1 = yield Note_1.default.save({ title: 'un', parent_id: folder1.id });
		const note2 = yield Note_1.default.save({ title: 'deux', parent_id: folder1.id });
		yield synchronizerStart();
		yield switchClient(2);
		yield synchronizerStart();
		yield Note_1.default.delete(note1.id);
		yield synchronizerStart();
		yield switchClient(1);
		yield synchronizerStart();
		const items = yield test_utils_synchronizer_1.allNotesFolders();
		expect(items.length).toBe(2);
		const deletedItems = yield BaseItem_1.default.deletedItems(syncTargetId());
		expect(deletedItems.length).toBe(0);
		yield Note_1.default.delete(note2.id);
		yield synchronizerStart();
	})));
	it('should delete remote folder', (() => __awaiter(this, void 0, void 0, function* () {
		yield Folder_1.default.save({ title: 'folder1' });
		const folder2 = yield Folder_1.default.save({ title: 'folder2' });
		yield synchronizerStart();
		yield switchClient(2);
		yield synchronizerStart();
		yield sleep(0.1);
		yield Folder_1.default.delete(folder2.id);
		yield synchronizerStart();
		const all = yield test_utils_synchronizer_1.allNotesFolders();
		yield test_utils_synchronizer_1.localNotesFoldersSameAsRemote(all, expect);
	})));
	it('should delete local folder', (() => __awaiter(this, void 0, void 0, function* () {
		yield Folder_1.default.save({ title: 'folder1' });
		const folder2 = yield Folder_1.default.save({ title: 'folder2' });
		yield synchronizerStart();
		yield switchClient(2);
		yield synchronizerStart();
		yield Folder_1.default.delete(folder2.id);
		yield synchronizerStart();
		yield switchClient(1);
		yield synchronizerStart();
		const items = yield test_utils_synchronizer_1.allNotesFolders();
		yield test_utils_synchronizer_1.localNotesFoldersSameAsRemote(items, expect);
	})));
	it('should cross delete all folders', (() => __awaiter(this, void 0, void 0, function* () {
		// If client1 and 2 have two folders, client 1 deletes item 1 and client
		// 2 deletes item 2, they should both end up with no items after sync.
		const folder1 = yield Folder_1.default.save({ title: 'folder1' });
		const folder2 = yield Folder_1.default.save({ title: 'folder2' });
		yield synchronizerStart();
		yield switchClient(2);
		yield synchronizerStart();
		yield sleep(0.1);
		yield Folder_1.default.delete(folder1.id);
		yield switchClient(1);
		yield Folder_1.default.delete(folder2.id);
		yield synchronizerStart();
		yield switchClient(2);
		yield synchronizerStart();
		const items2 = yield test_utils_synchronizer_1.allNotesFolders();
		yield switchClient(1);
		yield synchronizerStart();
		const items1 = yield test_utils_synchronizer_1.allNotesFolders();
		expect(items1.length).toBe(0);
		expect(items1.length).toBe(items2.length);
	})));
	it('items should be downloaded again when user cancels in the middle of delta operation', (() => __awaiter(this, void 0, void 0, function* () {
		const folder1 = yield Folder_1.default.save({ title: 'folder1' });
		yield Note_1.default.save({ title: 'un', is_todo: 1, parent_id: folder1.id });
		yield synchronizerStart();
		yield switchClient(2);
		synchronizer().testingHooks_ = ['cancelDeltaLoop2'];
		yield synchronizerStart();
		let notes = yield Note_1.default.all();
		expect(notes.length).toBe(0);
		synchronizer().testingHooks_ = [];
		yield synchronizerStart();
		notes = yield Note_1.default.all();
		expect(notes.length).toBe(1);
	})));
	it('should skip items that cannot be synced', (() => __awaiter(this, void 0, void 0, function* () {
		const folder1 = yield Folder_1.default.save({ title: 'folder1' });
		const note1 = yield Note_1.default.save({ title: 'un', is_todo: 1, parent_id: folder1.id });
		const noteId = note1.id;
		yield synchronizerStart();
		let disabledItems = yield BaseItem_1.default.syncDisabledItems(syncTargetId());
		expect(disabledItems.length).toBe(0);
		yield Note_1.default.save({ id: noteId, title: 'un mod' });
		synchronizer().testingHooks_ = ['notesRejectedByTarget'];
		yield synchronizerStart();
		synchronizer().testingHooks_ = [];
		yield synchronizerStart(); // Another sync to check that this item is now excluded from sync
		yield switchClient(2);
		yield synchronizerStart();
		const notes = yield Note_1.default.all();
		expect(notes.length).toBe(1);
		expect(notes[0].title).toBe('un');
		yield switchClient(1);
		disabledItems = yield BaseItem_1.default.syncDisabledItems(syncTargetId());
		expect(disabledItems.length).toBe(1);
	})));
	it('should allow duplicate folder titles', (() => __awaiter(this, void 0, void 0, function* () {
		yield Folder_1.default.save({ title: 'folder' });
		yield switchClient(2);
		let remoteF2 = yield Folder_1.default.save({ title: 'folder' });
		yield synchronizerStart();
		yield switchClient(1);
		yield sleep(0.1);
		yield synchronizerStart();
		const localF2 = yield Folder_1.default.load(remoteF2.id);
		expect(localF2.title == remoteF2.title).toBe(true);
		// Then that folder that has been renamed locally should be set in such a way
		// that synchronizing it applies the title change remotely, and that new title
		// should be retrieved by client 2.
		yield synchronizerStart();
		yield switchClient(2);
		yield sleep(0.1);
		yield synchronizerStart();
		remoteF2 = yield Folder_1.default.load(remoteF2.id);
		expect(remoteF2.title == localF2.title).toBe(true);
	})));
	it('should create remote items with UTF-8 content', (() => __awaiter(this, void 0, void 0, function* () {
		const folder = yield Folder_1.default.save({ title: 'Fahrräder' });
		yield Note_1.default.save({ title: 'Fahrräder', body: 'Fahrräder', parent_id: folder.id });
		const all = yield test_utils_synchronizer_1.allNotesFolders();
		yield synchronizerStart();
		yield test_utils_synchronizer_1.localNotesFoldersSameAsRemote(all, expect);
	})));
	it('should update remote items but not pull remote changes', (() => __awaiter(this, void 0, void 0, function* () {
		const folder = yield Folder_1.default.save({ title: 'folder1' });
		const note = yield Note_1.default.save({ title: 'un', parent_id: folder.id });
		yield synchronizerStart();
		yield switchClient(2);
		yield synchronizerStart();
		yield Note_1.default.save({ title: 'deux', parent_id: folder.id });
		yield synchronizerStart();
		yield switchClient(1);
		yield Note_1.default.save({ title: 'un UPDATE', id: note.id });
		yield synchronizerStart(null, { syncSteps: ['update_remote'] });
		const all = yield test_utils_synchronizer_1.allNotesFolders();
		expect(all.length).toBe(2);
		yield switchClient(2);
		yield synchronizerStart();
		const note2 = yield Note_1.default.load(note.id);
		expect(note2.title).toBe('un UPDATE');
	})));
	it('should create a new Welcome notebook on each client', (() => __awaiter(this, void 0, void 0, function* () {
		// Create the Welcome items on two separate clients
		yield WelcomeUtils.createWelcomeItems();
		yield synchronizerStart();
		yield switchClient(2);
		yield WelcomeUtils.createWelcomeItems();
		const beforeFolderCount = (yield Folder_1.default.all()).length;
		const beforeNoteCount = (yield Note_1.default.all()).length;
		expect(beforeFolderCount === 1).toBe(true);
		expect(beforeNoteCount > 1).toBe(true);
		yield synchronizerStart();
		const afterFolderCount = (yield Folder_1.default.all()).length;
		const afterNoteCount = (yield Note_1.default.all()).length;
		expect(afterFolderCount).toBe(beforeFolderCount * 2);
		expect(afterNoteCount).toBe(beforeNoteCount * 2);
		// Changes to the Welcome items should be synced to all clients
		const f1 = (yield Folder_1.default.all())[0];
		yield Folder_1.default.save({ id: f1.id, title: 'Welcome MOD' });
		yield synchronizerStart();
		yield switchClient(1);
		yield synchronizerStart();
		const f1_1 = yield Folder_1.default.load(f1.id);
		expect(f1_1.title).toBe('Welcome MOD');
	})));
	it('should not wipe out user data when syncing with an empty target', (() => __awaiter(this, void 0, void 0, function* () {
		// Only these targets support the wipeOutFailSafe flag (in other words, the targets that use basicDelta)
		if (!['nextcloud', 'memory', 'filesystem', 'amazon_s3'].includes(syncTargetName())) { return; }
		for (let i = 0; i < 10; i++) { yield Note_1.default.save({ title: 'note' }); }
		Setting_1.default.setValue('sync.wipeOutFailSafe', true);
		yield synchronizerStart();
		yield fileApi().clearRoot(); // oops
		yield synchronizerStart();
		expect((yield Note_1.default.all()).length).toBe(10); // but since the fail-safe if on, the notes have not been deleted
		Setting_1.default.setValue('sync.wipeOutFailSafe', false); // Now switch it off
		yield synchronizerStart();
		expect((yield Note_1.default.all()).length).toBe(0); // Since the fail-safe was off, the data has been cleared
		// Handle case where the sync target has been wiped out, then the user creates one note and sync.
		for (let i = 0; i < 10; i++) { yield Note_1.default.save({ title: 'note' }); }
		Setting_1.default.setValue('sync.wipeOutFailSafe', true);
		yield synchronizerStart();
		yield fileApi().clearRoot();
		yield Note_1.default.save({ title: 'ma note encore' });
		yield synchronizerStart();
		expect((yield Note_1.default.all()).length).toBe(11);
	})));
});
// # sourceMappingURL=Synchronizer.share.js.map
