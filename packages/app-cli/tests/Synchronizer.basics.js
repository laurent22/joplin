"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_utils_synchronizer_1 = require("./test-utils-synchronizer");
const { synchronizerStart, syncTargetName, allSyncTargetItemsEncrypted, tempFilePath, resourceFetcher, kvStore, revisionService, setupDatabaseAndSynchronizer, synchronizer, fileApi, sleep, switchClient, syncTargetId, encryptionService, loadEncryptionMasterKey, fileContentEqual, decryptionWorker, checkThrowAsync } = require('./test-utils.js');
const Folder = require('@joplin/lib/models/Folder.js');
const Note = require('@joplin/lib/models/Note.js');
const Resource = require('@joplin/lib/models/Resource.js');
const ResourceFetcher = require('@joplin/lib/services/ResourceFetcher');
const Tag = require('@joplin/lib/models/Tag.js');
const MasterKey = require('@joplin/lib/models/MasterKey');
const BaseItem = require('@joplin/lib/models/BaseItem.js');
const Revision = require('@joplin/lib/models/Revision.js');
const WelcomeUtils = require('@joplin/lib/WelcomeUtils');
let insideBeforeEach = false;
describe('Synchronizer.basics', function () {
    beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
        insideBeforeEach = true;
        yield setupDatabaseAndSynchronizer(1);
        yield setupDatabaseAndSynchronizer(2);
        yield switchClient(1);
        done();
        insideBeforeEach = false;
    }));
    it('should create remote items', (() => __awaiter(this, void 0, void 0, function* () {
        const folder = yield Folder.save({ title: 'folder1' });
        yield Note.save({ title: 'un', parent_id: folder.id });
        const all = yield test_utils_synchronizer_1.allNotesFolders();
        yield synchronizerStart();
        yield test_utils_synchronizer_1.localNotesFoldersSameAsRemote(all, expect);
    })));
    it('should update remote items', (() => __awaiter(this, void 0, void 0, function* () {
        const folder = yield Folder.save({ title: 'folder1' });
        const note = yield Note.save({ title: 'un', parent_id: folder.id });
        yield synchronizerStart();
        yield Note.save({ title: 'un UPDATE', id: note.id });
        const all = yield test_utils_synchronizer_1.allNotesFolders();
        yield synchronizerStart();
        yield test_utils_synchronizer_1.localNotesFoldersSameAsRemote(all, expect);
    })));
    it('should create local items', (() => __awaiter(this, void 0, void 0, function* () {
        const folder = yield Folder.save({ title: 'folder1' });
        yield Note.save({ title: 'un', parent_id: folder.id });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        const all = yield test_utils_synchronizer_1.allNotesFolders();
        yield test_utils_synchronizer_1.localNotesFoldersSameAsRemote(all, expect);
    })));
    it('should update local items', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder.save({ title: 'folder1' });
        const note1 = yield Note.save({ title: 'un', parent_id: folder1.id });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield sleep(0.1);
        let note2 = yield Note.load(note1.id);
        note2.title = 'Updated on client 2';
        yield Note.save(note2);
        note2 = yield Note.load(note2.id);
        yield synchronizerStart();
        yield switchClient(1);
        yield synchronizerStart();
        const all = yield test_utils_synchronizer_1.allNotesFolders();
        yield test_utils_synchronizer_1.localNotesFoldersSameAsRemote(all, expect);
    })));
    it('should delete remote notes', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder.save({ title: 'folder1' });
        const note1 = yield Note.save({ title: 'un', parent_id: folder1.id });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield sleep(0.1);
        yield Note.delete(note1.id);
        yield synchronizerStart();
        const remotes = yield test_utils_synchronizer_1.remoteNotesAndFolders();
        expect(remotes.length).toBe(1);
        expect(remotes[0].id).toBe(folder1.id);
        const deletedItems = yield BaseItem.deletedItems(syncTargetId());
        expect(deletedItems.length).toBe(0);
    })));
    it('should not created deleted_items entries for items deleted via sync', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder.save({ title: 'folder1' });
        yield Note.save({ title: 'un', parent_id: folder1.id });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield Folder.delete(folder1.id);
        yield synchronizerStart();
        yield switchClient(1);
        yield synchronizerStart();
        const deletedItems = yield BaseItem.deletedItems(syncTargetId());
        expect(deletedItems.length).toBe(0);
    })));
    it('should delete local notes', (() => __awaiter(this, void 0, void 0, function* () {
        // For these tests we pass the context around for each user. This is to make sure that the "deletedItemsProcessed"
        // property of the basicDelta() function is cleared properly at the end of a sync operation. If it is not cleared
        // it means items will no longer be deleted locally via sync.
        const folder1 = yield Folder.save({ title: 'folder1' });
        const note1 = yield Note.save({ title: 'un', parent_id: folder1.id });
        const note2 = yield Note.save({ title: 'deux', parent_id: folder1.id });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield Note.delete(note1.id);
        yield synchronizerStart();
        yield switchClient(1);
        yield synchronizerStart();
        const items = yield test_utils_synchronizer_1.allNotesFolders();
        expect(items.length).toBe(2);
        const deletedItems = yield BaseItem.deletedItems(syncTargetId());
        expect(deletedItems.length).toBe(0);
        yield Note.delete(note2.id);
        yield synchronizerStart();
    })));
    it('should delete remote folder', (() => __awaiter(this, void 0, void 0, function* () {
        yield Folder.save({ title: 'folder1' });
        const folder2 = yield Folder.save({ title: 'folder2' });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield sleep(0.1);
        yield Folder.delete(folder2.id);
        yield synchronizerStart();
        const all = yield test_utils_synchronizer_1.allNotesFolders();
        yield test_utils_synchronizer_1.localNotesFoldersSameAsRemote(all, expect);
    })));
    it('should delete local folder', (() => __awaiter(this, void 0, void 0, function* () {
        yield Folder.save({ title: 'folder1' });
        const folder2 = yield Folder.save({ title: 'folder2' });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield Folder.delete(folder2.id);
        yield synchronizerStart();
        yield switchClient(1);
        yield synchronizerStart();
        const items = yield test_utils_synchronizer_1.allNotesFolders();
        yield test_utils_synchronizer_1.localNotesFoldersSameAsRemote(items, expect);
    })));
    it('should cross delete all folders', (() => __awaiter(this, void 0, void 0, function* () {
        // If client1 and 2 have two folders, client 1 deletes item 1 and client
        // 2 deletes item 2, they should both end up with no items after sync.
        const folder1 = yield Folder.save({ title: 'folder1' });
        const folder2 = yield Folder.save({ title: 'folder2' });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield sleep(0.1);
        yield Folder.delete(folder1.id);
        yield switchClient(1);
        yield Folder.delete(folder2.id);
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
        const folder1 = yield Folder.save({ title: 'folder1' });
        yield Note.save({ title: 'un', is_todo: 1, parent_id: folder1.id });
        yield synchronizerStart();
        yield switchClient(2);
        synchronizer().testingHooks_ = ['cancelDeltaLoop2'];
        yield synchronizerStart();
        let notes = yield Note.all();
        expect(notes.length).toBe(0);
        synchronizer().testingHooks_ = [];
        yield synchronizerStart();
        notes = yield Note.all();
        expect(notes.length).toBe(1);
    })));
    it('should skip items that cannot be synced', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder.save({ title: 'folder1' });
        const note1 = yield Note.save({ title: 'un', is_todo: 1, parent_id: folder1.id });
        const noteId = note1.id;
        yield synchronizerStart();
        let disabledItems = yield BaseItem.syncDisabledItems(syncTargetId());
        expect(disabledItems.length).toBe(0);
        yield Note.save({ id: noteId, title: 'un mod' });
        synchronizer().testingHooks_ = ['notesRejectedByTarget'];
        yield synchronizerStart();
        synchronizer().testingHooks_ = [];
        yield synchronizerStart(); // Another sync to check that this item is now excluded from sync
        yield switchClient(2);
        yield synchronizerStart();
        const notes = yield Note.all();
        expect(notes.length).toBe(1);
        expect(notes[0].title).toBe('un');
        yield switchClient(1);
        disabledItems = yield BaseItem.syncDisabledItems(syncTargetId());
        expect(disabledItems.length).toBe(1);
    })));
});
//# sourceMappingURL=Synchronizer.basics.js.map