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
const time_1 = require("@joplin/lib/time");
const shim_1 = require("@joplin/lib/shim");
const Setting_1 = require("@joplin/lib/models/Setting");
const BaseModel_1 = require("@joplin/lib/BaseModel");
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
function allNotesFolders() {
    return __awaiter(this, void 0, void 0, function* () {
        const folders = yield Folder.all();
        const notes = yield Note.all();
        return folders.concat(notes);
    });
}
function remoteItemsByTypes(types) {
    return __awaiter(this, void 0, void 0, function* () {
        const list = yield fileApi().list('', { includeDirs: false, syncItemsOnly: true });
        if (list.has_more)
            throw new Error('Not implemented!!!');
        const files = list.items;
        const output = [];
        for (const file of files) {
            const remoteContent = yield fileApi().get(file.path);
            const content = yield BaseItem.unserialize(remoteContent);
            if (types.indexOf(content.type_) < 0)
                continue;
            output.push(content);
        }
        return output;
    });
}
function remoteNotesAndFolders() {
    return __awaiter(this, void 0, void 0, function* () {
        return remoteItemsByTypes([BaseModel_1.default.TYPE_NOTE, BaseModel_1.default.TYPE_FOLDER]);
    });
}
function remoteNotesFoldersResources() {
    return __awaiter(this, void 0, void 0, function* () {
        return remoteItemsByTypes([BaseModel_1.default.TYPE_NOTE, BaseModel_1.default.TYPE_FOLDER, BaseModel_1.default.TYPE_RESOURCE]);
    });
}
function remoteResources() {
    return __awaiter(this, void 0, void 0, function* () {
        return remoteItemsByTypes([BaseModel_1.default.TYPE_RESOURCE]);
    });
}
function localNotesFoldersSameAsRemote(locals, expect) {
    return __awaiter(this, void 0, void 0, function* () {
        let error = null;
        try {
            const nf = yield remoteNotesAndFolders();
            expect(locals.length).toBe(nf.length);
            for (let i = 0; i < locals.length; i++) {
                const dbItem = locals[i];
                const path = BaseItem.systemPath(dbItem);
                const remote = yield fileApi().stat(path);
                expect(!!remote).toBe(true);
                if (!remote)
                    continue;
                let remoteContent = yield fileApi().get(path);
                remoteContent = dbItem.type_ == BaseModel_1.default.TYPE_NOTE ? yield Note.unserialize(remoteContent) : yield Folder.unserialize(remoteContent);
                expect(remoteContent.title).toBe(dbItem.title);
            }
        }
        catch (e) {
            error = e;
        }
        expect(error).toBe(null);
    });
}
let insideBeforeEach = false;
describe('synchronizer', function () {
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
        const all = yield allNotesFolders();
        yield synchronizerStart();
        yield localNotesFoldersSameAsRemote(all, expect);
    })));
    it('should update remote items', (() => __awaiter(this, void 0, void 0, function* () {
        const folder = yield Folder.save({ title: 'folder1' });
        const note = yield Note.save({ title: 'un', parent_id: folder.id });
        yield synchronizerStart();
        yield Note.save({ title: 'un UPDATE', id: note.id });
        const all = yield allNotesFolders();
        yield synchronizerStart();
        yield localNotesFoldersSameAsRemote(all, expect);
    })));
    it('should create local items', (() => __awaiter(this, void 0, void 0, function* () {
        const folder = yield Folder.save({ title: 'folder1' });
        yield Note.save({ title: 'un', parent_id: folder.id });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        const all = yield allNotesFolders();
        yield localNotesFoldersSameAsRemote(all, expect);
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
        const all = yield allNotesFolders();
        yield localNotesFoldersSameAsRemote(all, expect);
    })));
    it('should resolve note conflicts', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder.save({ title: 'folder1' });
        const note1 = yield Note.save({ title: 'un', parent_id: folder1.id });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        let note2 = yield Note.load(note1.id);
        note2.title = 'Updated on client 2';
        yield Note.save(note2);
        note2 = yield Note.load(note2.id);
        yield synchronizerStart();
        yield switchClient(1);
        let note2conf = yield Note.load(note1.id);
        note2conf.title = 'Updated on client 1';
        yield Note.save(note2conf);
        note2conf = yield Note.load(note1.id);
        yield synchronizerStart();
        const conflictedNotes = yield Note.conflictedNotes();
        expect(conflictedNotes.length).toBe(1);
        // Other than the id (since the conflicted note is a duplicate), and the is_conflict property
        // the conflicted and original note must be the same in every way, to make sure no data has been lost.
        const conflictedNote = conflictedNotes[0];
        expect(conflictedNote.id == note2conf.id).toBe(false);
        for (const n in conflictedNote) {
            if (!conflictedNote.hasOwnProperty(n))
                continue;
            if (n == 'id' || n == 'is_conflict')
                continue;
            expect(conflictedNote[n]).toBe(note2conf[n]);
        }
        const noteUpdatedFromRemote = yield Note.load(note1.id);
        for (const n in noteUpdatedFromRemote) {
            if (!noteUpdatedFromRemote.hasOwnProperty(n))
                continue;
            expect(noteUpdatedFromRemote[n]).toBe(note2[n]);
        }
    })));
    it('should resolve folders conflicts', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder.save({ title: 'folder1' });
        yield Note.save({ title: 'un', parent_id: folder1.id });
        yield synchronizerStart();
        yield switchClient(2); // ----------------------------------
        yield synchronizerStart();
        yield sleep(0.1);
        let folder1_modRemote = yield Folder.load(folder1.id);
        folder1_modRemote.title = 'folder1 UPDATE CLIENT 2';
        yield Folder.save(folder1_modRemote);
        folder1_modRemote = yield Folder.load(folder1_modRemote.id);
        yield synchronizerStart();
        yield switchClient(1); // ----------------------------------
        yield sleep(0.1);
        let folder1_modLocal = yield Folder.load(folder1.id);
        folder1_modLocal.title = 'folder1 UPDATE CLIENT 1';
        yield Folder.save(folder1_modLocal);
        folder1_modLocal = yield Folder.load(folder1.id);
        yield synchronizerStart();
        const folder1_final = yield Folder.load(folder1.id);
        expect(folder1_final.title).toBe(folder1_modRemote.title);
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
        const remotes = yield remoteNotesAndFolders();
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
        const items = yield allNotesFolders();
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
        const all = yield allNotesFolders();
        yield localNotesFoldersSameAsRemote(all, expect);
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
        const items = yield allNotesFolders();
        yield localNotesFoldersSameAsRemote(items, expect);
    })));
    it('should resolve conflict if remote folder has been deleted, but note has been added to folder locally', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder.save({ title: 'folder1' });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield Folder.delete(folder1.id);
        yield synchronizerStart();
        yield switchClient(1);
        yield Note.save({ title: 'note1', parent_id: folder1.id });
        yield synchronizerStart();
        const items = yield allNotesFolders();
        expect(items.length).toBe(1);
        expect(items[0].title).toBe('note1');
        expect(items[0].is_conflict).toBe(1);
    })));
    it('should resolve conflict if note has been deleted remotely and locally', (() => __awaiter(this, void 0, void 0, function* () {
        const folder = yield Folder.save({ title: 'folder' });
        const note = yield Note.save({ title: 'note', parent_id: folder.title });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield Note.delete(note.id);
        yield synchronizerStart();
        yield switchClient(1);
        yield Note.delete(note.id);
        yield synchronizerStart();
        const items = yield allNotesFolders();
        expect(items.length).toBe(1);
        expect(items[0].title).toBe('folder');
        yield localNotesFoldersSameAsRemote(items, expect);
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
        const items2 = yield allNotesFolders();
        yield switchClient(1);
        yield synchronizerStart();
        const items1 = yield allNotesFolders();
        expect(items1.length).toBe(0);
        expect(items1.length).toBe(items2.length);
    })));
    it('should handle conflict when remote note is deleted then local note is modified', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder.save({ title: 'folder1' });
        const note1 = yield Note.save({ title: 'un', parent_id: folder1.id });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield sleep(0.1);
        yield Note.delete(note1.id);
        yield synchronizerStart();
        yield switchClient(1);
        const newTitle = 'Modified after having been deleted';
        yield Note.save({ id: note1.id, title: newTitle });
        yield synchronizerStart();
        const conflictedNotes = yield Note.conflictedNotes();
        expect(conflictedNotes.length).toBe(1);
        expect(conflictedNotes[0].title).toBe(newTitle);
        const unconflictedNotes = yield Note.unconflictedNotes();
        expect(unconflictedNotes.length).toBe(0);
    })));
    it('should handle conflict when remote folder is deleted then local folder is renamed', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder.save({ title: 'folder1' });
        yield Folder.save({ title: 'folder2' });
        yield Note.save({ title: 'un', parent_id: folder1.id });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield sleep(0.1);
        yield Folder.delete(folder1.id);
        yield synchronizerStart();
        yield switchClient(1);
        yield sleep(0.1);
        const newTitle = 'Modified after having been deleted';
        yield Folder.save({ id: folder1.id, title: newTitle });
        yield synchronizerStart();
        const items = yield allNotesFolders();
        expect(items.length).toBe(1);
    })));
    it('should allow duplicate folder titles', (() => __awaiter(this, void 0, void 0, function* () {
        yield Folder.save({ title: 'folder' });
        yield switchClient(2);
        let remoteF2 = yield Folder.save({ title: 'folder' });
        yield synchronizerStart();
        yield switchClient(1);
        yield sleep(0.1);
        yield synchronizerStart();
        const localF2 = yield Folder.load(remoteF2.id);
        expect(localF2.title == remoteF2.title).toBe(true);
        // Then that folder that has been renamed locally should be set in such a way
        // that synchronizing it applies the title change remotely, and that new title
        // should be retrieved by client 2.
        yield synchronizerStart();
        yield switchClient(2);
        yield sleep(0.1);
        yield synchronizerStart();
        remoteF2 = yield Folder.load(remoteF2.id);
        expect(remoteF2.title == localF2.title).toBe(true);
    })));
    function shoudSyncTagTest(withEncryption) {
        return __awaiter(this, void 0, void 0, function* () {
            let masterKey = null;
            if (withEncryption) {
                Setting_1.default.setValue('encryption.enabled', true);
                masterKey = yield loadEncryptionMasterKey();
            }
            yield Folder.save({ title: 'folder' });
            const n1 = yield Note.save({ title: 'mynote' });
            const n2 = yield Note.save({ title: 'mynote2' });
            const tag = yield Tag.save({ title: 'mytag' });
            yield synchronizerStart();
            yield switchClient(2);
            yield synchronizerStart();
            if (withEncryption) {
                const masterKey_2 = yield MasterKey.load(masterKey.id);
                yield encryptionService().loadMasterKey_(masterKey_2, '123456', true);
                const t = yield Tag.load(tag.id);
                yield Tag.decrypt(t);
            }
            const remoteTag = yield Tag.loadByTitle(tag.title);
            expect(!!remoteTag).toBe(true);
            expect(remoteTag.id).toBe(tag.id);
            yield Tag.addNote(remoteTag.id, n1.id);
            yield Tag.addNote(remoteTag.id, n2.id);
            let noteIds = yield Tag.noteIds(tag.id);
            expect(noteIds.length).toBe(2);
            yield synchronizerStart();
            yield switchClient(1);
            yield synchronizerStart();
            let remoteNoteIds = yield Tag.noteIds(tag.id);
            expect(remoteNoteIds.length).toBe(2);
            yield Tag.removeNote(tag.id, n1.id);
            remoteNoteIds = yield Tag.noteIds(tag.id);
            expect(remoteNoteIds.length).toBe(1);
            yield synchronizerStart();
            yield switchClient(2);
            yield synchronizerStart();
            noteIds = yield Tag.noteIds(tag.id);
            expect(noteIds.length).toBe(1);
            expect(remoteNoteIds[0]).toBe(noteIds[0]);
        });
    }
    it('should sync tags', (() => __awaiter(this, void 0, void 0, function* () {
        yield shoudSyncTagTest(false);
    })));
    it('should sync encrypted tags', (() => __awaiter(this, void 0, void 0, function* () {
        yield shoudSyncTagTest(true);
    })));
    it('should not sync notes with conflicts', (() => __awaiter(this, void 0, void 0, function* () {
        const f1 = yield Folder.save({ title: 'folder' });
        yield Note.save({ title: 'mynote', parent_id: f1.id, is_conflict: 1 });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        const notes = yield Note.all();
        const folders = yield Folder.all();
        expect(notes.length).toBe(0);
        expect(folders.length).toBe(1);
    })));
    it('should not try to delete on remote conflicted notes that have been deleted', (() => __awaiter(this, void 0, void 0, function* () {
        const f1 = yield Folder.save({ title: 'folder' });
        const n1 = yield Note.save({ title: 'mynote', parent_id: f1.id });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield Note.save({ id: n1.id, is_conflict: 1 });
        yield Note.delete(n1.id);
        const deletedItems = yield BaseItem.deletedItems(syncTargetId());
        expect(deletedItems.length).toBe(0);
    })));
    function ignorableNoteConflictTest(withEncryption) {
        return __awaiter(this, void 0, void 0, function* () {
            if (withEncryption) {
                Setting_1.default.setValue('encryption.enabled', true);
                yield loadEncryptionMasterKey();
            }
            const folder1 = yield Folder.save({ title: 'folder1' });
            const note1 = yield Note.save({ title: 'un', is_todo: 1, parent_id: folder1.id });
            yield synchronizerStart();
            yield switchClient(2);
            yield synchronizerStart();
            if (withEncryption) {
                yield loadEncryptionMasterKey(null, true);
                yield decryptionWorker().start();
            }
            let note2 = yield Note.load(note1.id);
            note2.todo_completed = time_1.default.unixMs() - 1;
            yield Note.save(note2);
            note2 = yield Note.load(note2.id);
            yield synchronizerStart();
            yield switchClient(1);
            let note2conf = yield Note.load(note1.id);
            note2conf.todo_completed = time_1.default.unixMs();
            yield Note.save(note2conf);
            note2conf = yield Note.load(note1.id);
            yield synchronizerStart();
            if (!withEncryption) {
                // That was previously a common conflict:
                // - Client 1 mark todo as "done", and sync
                // - Client 2 doesn't sync, mark todo as "done" todo. Then sync.
                // In theory it is a conflict because the todo_completed dates are different
                // but in practice it doesn't matter, we can just take the date when the
                // todo was marked as "done" the first time.
                const conflictedNotes = yield Note.conflictedNotes();
                expect(conflictedNotes.length).toBe(0);
                const notes = yield Note.all();
                expect(notes.length).toBe(1);
                expect(notes[0].id).toBe(note1.id);
                expect(notes[0].todo_completed).toBe(note2.todo_completed);
            }
            else {
                // If the notes are encrypted however it's not possible to do this kind of
                // smart conflict resolving since we don't know the content, so in that
                // case it's handled as a regular conflict.
                const conflictedNotes = yield Note.conflictedNotes();
                expect(conflictedNotes.length).toBe(1);
                const notes = yield Note.all();
                expect(notes.length).toBe(2);
            }
        });
    }
    it('should not consider it is a conflict if neither the title nor body of the note have changed', (() => __awaiter(this, void 0, void 0, function* () {
        yield ignorableNoteConflictTest(false);
    })));
    it('should always handle conflict if local or remote are encrypted', (() => __awaiter(this, void 0, void 0, function* () {
        yield ignorableNoteConflictTest(true);
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
    it('notes and folders should get encrypted when encryption is enabled', (() => __awaiter(this, void 0, void 0, function* () {
        Setting_1.default.setValue('encryption.enabled', true);
        const masterKey = yield loadEncryptionMasterKey();
        const folder1 = yield Folder.save({ title: 'folder1' });
        let note1 = yield Note.save({ title: 'un', body: 'to be encrypted', parent_id: folder1.id });
        yield synchronizerStart();
        // After synchronisation, remote items should be encrypted but local ones remain plain text
        note1 = yield Note.load(note1.id);
        expect(note1.title).toBe('un');
        yield switchClient(2);
        yield synchronizerStart();
        let folder1_2 = yield Folder.load(folder1.id);
        let note1_2 = yield Note.load(note1.id);
        const masterKey_2 = yield MasterKey.load(masterKey.id);
        // On this side however it should be received encrypted
        expect(!note1_2.title).toBe(true);
        expect(!folder1_2.title).toBe(true);
        expect(!!note1_2.encryption_cipher_text).toBe(true);
        expect(!!folder1_2.encryption_cipher_text).toBe(true);
        // Master key is already encrypted so it does not get re-encrypted during sync
        expect(masterKey_2.content).toBe(masterKey.content);
        expect(masterKey_2.checksum).toBe(masterKey.checksum);
        // Now load the master key we got from client 1 and try to decrypt
        yield encryptionService().loadMasterKey_(masterKey_2, '123456', true);
        // Get the decrypted items back
        yield Folder.decrypt(folder1_2);
        yield Note.decrypt(note1_2);
        folder1_2 = yield Folder.load(folder1.id);
        note1_2 = yield Note.load(note1.id);
        // Check that properties match the original items. Also check
        // the encryption did not affect the updated_time timestamp.
        expect(note1_2.title).toBe(note1.title);
        expect(note1_2.body).toBe(note1.body);
        expect(note1_2.updated_time).toBe(note1.updated_time);
        expect(!note1_2.encryption_cipher_text).toBe(true);
        expect(folder1_2.title).toBe(folder1.title);
        expect(folder1_2.updated_time).toBe(folder1.updated_time);
        expect(!folder1_2.encryption_cipher_text).toBe(true);
    })));
    it('should enable encryption automatically when downloading new master key (and none was previously available)', (() => __awaiter(this, void 0, void 0, function* () {
        // Enable encryption on client 1 and sync an item
        Setting_1.default.setValue('encryption.enabled', true);
        yield loadEncryptionMasterKey();
        let folder1 = yield Folder.save({ title: 'folder1' });
        yield synchronizerStart();
        yield switchClient(2);
        // Synchronising should enable encryption since we're going to get a master key
        expect(Setting_1.default.value('encryption.enabled')).toBe(false);
        yield synchronizerStart();
        expect(Setting_1.default.value('encryption.enabled')).toBe(true);
        // Check that we got the master key from client 1
        const masterKey = (yield MasterKey.all())[0];
        expect(!!masterKey).toBe(true);
        // Since client 2 hasn't supplied a password yet, no master key is currently loaded
        expect(encryptionService().loadedMasterKeyIds().length).toBe(0);
        // If we sync now, nothing should be sent to target since we don't have a password.
        // Technically it's incorrect to set the property of an encrypted variable but it allows confirming
        // that encryption doesn't work if user hasn't supplied a password.
        yield BaseItem.forceSync(folder1.id);
        yield synchronizerStart();
        yield switchClient(1);
        yield synchronizerStart();
        folder1 = yield Folder.load(folder1.id);
        expect(folder1.title).toBe('folder1'); // Still at old value
        yield switchClient(2);
        // Now client 2 set the master key password
        Setting_1.default.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        // Now that master key should be loaded
        expect(encryptionService().loadedMasterKeyIds()[0]).toBe(masterKey.id);
        // Decrypt all the data. Now change the title and sync again - this time the changes should be transmitted
        yield decryptionWorker().start();
        yield Folder.save({ id: folder1.id, title: 'change test' });
        // If we sync now, this time client 1 should get the changes we did earlier
        yield synchronizerStart();
        yield switchClient(1);
        yield synchronizerStart();
        // Decrypt the data we just got
        yield decryptionWorker().start();
        folder1 = yield Folder.load(folder1.id);
        expect(folder1.title).toBe('change test'); // Got title from client 2
    })));
    it('should encrypt existing notes too when enabling E2EE', (() => __awaiter(this, void 0, void 0, function* () {
        // First create a folder, without encryption enabled, and sync it
        yield Folder.save({ title: 'folder1' });
        yield synchronizerStart();
        let files = yield fileApi().list('', { includeDirs: false, syncItemsOnly: true });
        let content = yield fileApi().get(files.items[0].path);
        expect(content.indexOf('folder1') >= 0).toBe(true);
        // Then enable encryption and sync again
        let masterKey = yield encryptionService().generateMasterKey('123456');
        masterKey = yield MasterKey.save(masterKey);
        yield encryptionService().enableEncryption(masterKey, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        yield synchronizerStart();
        // Even though the folder has not been changed it should have been synced again so that
        // an encrypted version of it replaces the decrypted version.
        files = yield fileApi().list('', { includeDirs: false, syncItemsOnly: true });
        expect(files.items.length).toBe(2);
        // By checking that the folder title is not present, we can confirm that the item has indeed been encrypted
        // One of the two items is the master key
        content = yield fileApi().get(files.items[0].path);
        expect(content.indexOf('folder1') < 0).toBe(true);
        content = yield fileApi().get(files.items[1].path);
        expect(content.indexOf('folder1') < 0).toBe(true);
    })));
    it('should sync resources', (() => __awaiter(this, void 0, void 0, function* () {
        while (insideBeforeEach)
            yield time_1.default.msleep(500);
        const folder1 = yield Folder.save({ title: 'folder1' });
        const note1 = yield Note.save({ title: 'ma note', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        const resource1 = (yield Resource.all())[0];
        const resourcePath1 = Resource.fullPath(resource1);
        yield synchronizerStart();
        expect((yield remoteNotesFoldersResources()).length).toBe(3);
        yield switchClient(2);
        yield synchronizerStart();
        const allResources = yield Resource.all();
        expect(allResources.length).toBe(1);
        let resource1_2 = allResources[0];
        let ls = yield Resource.localState(resource1_2);
        expect(resource1_2.id).toBe(resource1.id);
        expect(ls.fetch_status).toBe(Resource.FETCH_STATUS_IDLE);
        const fetcher = new ResourceFetcher(() => { return synchronizer().api(); });
        fetcher.queueDownload_(resource1_2.id);
        yield fetcher.waitForAllFinished();
        resource1_2 = yield Resource.load(resource1.id);
        ls = yield Resource.localState(resource1_2);
        expect(ls.fetch_status).toBe(Resource.FETCH_STATUS_DONE);
        const resourcePath1_2 = Resource.fullPath(resource1_2);
        expect(fileContentEqual(resourcePath1, resourcePath1_2)).toBe(true);
    })));
    it('should handle resource download errors', (() => __awaiter(this, void 0, void 0, function* () {
        while (insideBeforeEach)
            yield time_1.default.msleep(500);
        const folder1 = yield Folder.save({ title: 'folder1' });
        const note1 = yield Note.save({ title: 'ma note', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        let resource1 = (yield Resource.all())[0];
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        const fetcher = new ResourceFetcher(() => {
            return {
                // Simulate a failed download
                get: () => { return new Promise((_resolve, reject) => { reject(new Error('did not work')); }); },
            };
        });
        fetcher.queueDownload_(resource1.id);
        yield fetcher.waitForAllFinished();
        resource1 = yield Resource.load(resource1.id);
        const ls = yield Resource.localState(resource1);
        expect(ls.fetch_status).toBe(Resource.FETCH_STATUS_ERROR);
        expect(ls.fetch_error).toBe('did not work');
    })));
    it('should set the resource file size if it is missing', (() => __awaiter(this, void 0, void 0, function* () {
        while (insideBeforeEach)
            yield time_1.default.msleep(500);
        const folder1 = yield Folder.save({ title: 'folder1' });
        const note1 = yield Note.save({ title: 'ma note', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        let r1 = (yield Resource.all())[0];
        yield Resource.setFileSizeOnly(r1.id, -1);
        r1 = yield Resource.load(r1.id);
        expect(r1.size).toBe(-1);
        const fetcher = new ResourceFetcher(() => { return synchronizer().api(); });
        fetcher.queueDownload_(r1.id);
        yield fetcher.waitForAllFinished();
        r1 = yield Resource.load(r1.id);
        expect(r1.size).toBe(2720);
    })));
    it('should delete resources', (() => __awaiter(this, void 0, void 0, function* () {
        while (insideBeforeEach)
            yield time_1.default.msleep(500);
        const folder1 = yield Folder.save({ title: 'folder1' });
        const note1 = yield Note.save({ title: 'ma note', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        const resource1 = (yield Resource.all())[0];
        const resourcePath1 = Resource.fullPath(resource1);
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        let allResources = yield Resource.all();
        expect(allResources.length).toBe(1);
        expect((yield remoteNotesFoldersResources()).length).toBe(3);
        yield Resource.delete(resource1.id);
        yield synchronizerStart();
        expect((yield remoteNotesFoldersResources()).length).toBe(2);
        const remoteBlob = yield fileApi().stat(`.resource/${resource1.id}`);
        expect(!remoteBlob).toBe(true);
        yield switchClient(1);
        expect(yield shim_1.default.fsDriver().exists(resourcePath1)).toBe(true);
        yield synchronizerStart();
        allResources = yield Resource.all();
        expect(allResources.length).toBe(0);
        expect(yield shim_1.default.fsDriver().exists(resourcePath1)).toBe(false);
    })));
    it('should encryt resources', (() => __awaiter(this, void 0, void 0, function* () {
        Setting_1.default.setValue('encryption.enabled', true);
        const masterKey = yield loadEncryptionMasterKey();
        const folder1 = yield Folder.save({ title: 'folder1' });
        const note1 = yield Note.save({ title: 'ma note', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        const resource1 = (yield Resource.all())[0];
        const resourcePath1 = Resource.fullPath(resource1);
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        Setting_1.default.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        const fetcher = new ResourceFetcher(() => { return synchronizer().api(); });
        fetcher.queueDownload_(resource1.id);
        yield fetcher.waitForAllFinished();
        let resource1_2 = (yield Resource.all())[0];
        resource1_2 = yield Resource.decrypt(resource1_2);
        const resourcePath1_2 = Resource.fullPath(resource1_2);
        expect(fileContentEqual(resourcePath1, resourcePath1_2)).toBe(true);
    })));
    it('should sync resource blob changes', (() => __awaiter(this, void 0, void 0, function* () {
        const tempFile = tempFilePath('txt');
        yield shim_1.default.fsDriver().writeFile(tempFile, '1234', 'utf8');
        const folder1 = yield Folder.save({ title: 'folder1' });
        const note1 = yield Note.save({ title: 'ma note', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, tempFile);
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield resourceFetcher().start();
        yield resourceFetcher().waitForAllFinished();
        let resource1_2 = (yield Resource.all())[0];
        const modFile = tempFilePath('txt');
        yield shim_1.default.fsDriver().writeFile(modFile, '1234 MOD', 'utf8');
        yield Resource.updateResourceBlobContent(resource1_2.id, modFile);
        const originalSize = resource1_2.size;
        resource1_2 = (yield Resource.all())[0];
        const newSize = resource1_2.size;
        expect(originalSize).toBe(4);
        expect(newSize).toBe(8);
        yield synchronizerStart();
        yield switchClient(1);
        yield synchronizerStart();
        yield resourceFetcher().start();
        yield resourceFetcher().waitForAllFinished();
        const resource1_1 = (yield Resource.all())[0];
        expect(resource1_1.size).toBe(newSize);
        expect(yield Resource.resourceBlobContent(resource1_1.id, 'utf8')).toBe('1234 MOD');
    })));
    it('should handle resource conflicts', (() => __awaiter(this, void 0, void 0, function* () {
        {
            const tempFile = tempFilePath('txt');
            yield shim_1.default.fsDriver().writeFile(tempFile, '1234', 'utf8');
            const folder1 = yield Folder.save({ title: 'folder1' });
            const note1 = yield Note.save({ title: 'ma note', parent_id: folder1.id });
            yield shim_1.default.attachFileToNote(note1, tempFile);
            yield synchronizerStart();
        }
        yield switchClient(2);
        {
            yield synchronizerStart();
            yield resourceFetcher().start();
            yield resourceFetcher().waitForAllFinished();
            const resource = (yield Resource.all())[0];
            const modFile2 = tempFilePath('txt');
            yield shim_1.default.fsDriver().writeFile(modFile2, '1234 MOD 2', 'utf8');
            yield Resource.updateResourceBlobContent(resource.id, modFile2);
            yield synchronizerStart();
        }
        yield switchClient(1);
        {
            // Going to modify a resource without syncing first, which will cause a conflict
            const resource = (yield Resource.all())[0];
            const modFile1 = tempFilePath('txt');
            yield shim_1.default.fsDriver().writeFile(modFile1, '1234 MOD 1', 'utf8');
            yield Resource.updateResourceBlobContent(resource.id, modFile1);
            yield synchronizerStart(); // CONFLICT
            // If we try to read the resource content now, it should throw because the local
            // content has been moved to the conflict notebook, and the new local content
            // has not been downloaded yet.
            yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield Resource.resourceBlobContent(resource.id); }));
            // Now download resources, and our local content would have been overwritten by
            // the content from client 2
            yield resourceFetcher().start();
            yield resourceFetcher().waitForAllFinished();
            const localContent = yield Resource.resourceBlobContent(resource.id, 'utf8');
            expect(localContent).toBe('1234 MOD 2');
            // Check that the Conflict note has been generated, with the conflict resource
            // attached to it, and check that it has the original content.
            const allNotes = yield Note.all();
            expect(allNotes.length).toBe(2);
            const conflictNote = allNotes.find((v) => {
                return !!v.is_conflict;
            });
            expect(!!conflictNote).toBe(true);
            const resourceIds = yield Note.linkedResourceIds(conflictNote.body);
            expect(resourceIds.length).toBe(1);
            const conflictContent = yield Resource.resourceBlobContent(resourceIds[0], 'utf8');
            expect(conflictContent).toBe('1234 MOD 1');
        }
    })));
    it('should handle resource conflicts if a resource is changed locally but deleted remotely', (() => __awaiter(this, void 0, void 0, function* () {
        {
            const tempFile = tempFilePath('txt');
            yield shim_1.default.fsDriver().writeFile(tempFile, '1234', 'utf8');
            const folder1 = yield Folder.save({ title: 'folder1' });
            const note1 = yield Note.save({ title: 'ma note', parent_id: folder1.id });
            yield shim_1.default.attachFileToNote(note1, tempFile);
            yield synchronizerStart();
        }
        yield switchClient(2);
        {
            yield synchronizerStart();
            yield resourceFetcher().start();
            yield resourceFetcher().waitForAllFinished();
        }
        yield switchClient(1);
        {
            const resource = (yield Resource.all())[0];
            yield Resource.delete(resource.id);
            yield synchronizerStart();
        }
        yield switchClient(2);
        {
            const originalResource = (yield Resource.all())[0];
            yield Resource.save({ id: originalResource.id, title: 'modified resource' });
            yield synchronizerStart(); // CONFLICT
            const deletedResource = yield Resource.load(originalResource.id);
            expect(!deletedResource).toBe(true);
            const allResources = yield Resource.all();
            expect(allResources.length).toBe(1);
            const conflictResource = allResources[0];
            expect(originalResource.id).not.toBe(conflictResource.id);
            expect(conflictResource.title).toBe('modified resource');
        }
    })));
    it('should upload decrypted items to sync target after encryption disabled', (() => __awaiter(this, void 0, void 0, function* () {
        Setting_1.default.setValue('encryption.enabled', true);
        yield loadEncryptionMasterKey();
        yield Folder.save({ title: 'folder1' });
        yield synchronizerStart();
        let allEncrypted = yield allSyncTargetItemsEncrypted();
        expect(allEncrypted).toBe(true);
        yield encryptionService().disableEncryption();
        yield synchronizerStart();
        allEncrypted = yield allSyncTargetItemsEncrypted();
        expect(allEncrypted).toBe(false);
    })));
    it('should not upload any item if encryption was enabled, and items have not been decrypted, and then encryption disabled', (() => __awaiter(this, void 0, void 0, function* () {
        // For some reason I can't explain, this test is sometimes executed before beforeEach is finished
        // which means it's going to fail in unexpected way. So the loop below wait for beforeEach to be done.
        while (insideBeforeEach)
            yield time_1.default.msleep(100);
        Setting_1.default.setValue('encryption.enabled', true);
        const masterKey = yield loadEncryptionMasterKey();
        yield Folder.save({ title: 'folder1' });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        expect(Setting_1.default.value('encryption.enabled')).toBe(true);
        // If we try to disable encryption now, it should throw an error because some items are
        // currently encrypted. They must be decrypted first so that they can be sent as
        // plain text to the sync target.
        // let hasThrown = await checkThrowAsync(async () => await encryptionService().disableEncryption());
        // expect(hasThrown).toBe(true);
        // Now supply the password, and decrypt the items
        Setting_1.default.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        yield decryptionWorker().start();
        // Try to disable encryption again
        const hasThrown = yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield encryptionService().disableEncryption(); }));
        expect(hasThrown).toBe(false);
        // If we sync now the target should receive the decrypted items
        yield synchronizerStart();
        const allEncrypted = yield allSyncTargetItemsEncrypted();
        expect(allEncrypted).toBe(false);
    })));
    it('should set the resource file size after decryption', (() => __awaiter(this, void 0, void 0, function* () {
        Setting_1.default.setValue('encryption.enabled', true);
        const masterKey = yield loadEncryptionMasterKey();
        const folder1 = yield Folder.save({ title: 'folder1' });
        const note1 = yield Note.save({ title: 'ma note', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        const resource1 = (yield Resource.all())[0];
        yield Resource.setFileSizeOnly(resource1.id, -1);
        Resource.fullPath(resource1);
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        Setting_1.default.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        const fetcher = new ResourceFetcher(() => { return synchronizer().api(); });
        fetcher.queueDownload_(resource1.id);
        yield fetcher.waitForAllFinished();
        yield decryptionWorker().start();
        const resource1_2 = yield Resource.load(resource1.id);
        expect(resource1_2.size).toBe(2720);
    })));
    it('should encrypt remote resources after encryption has been enabled', (() => __awaiter(this, void 0, void 0, function* () {
        while (insideBeforeEach)
            yield time_1.default.msleep(100);
        const folder1 = yield Folder.save({ title: 'folder1' });
        const note1 = yield Note.save({ title: 'ma note', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        yield synchronizerStart();
        expect(yield allSyncTargetItemsEncrypted()).toBe(false);
        const masterKey = yield loadEncryptionMasterKey();
        yield encryptionService().enableEncryption(masterKey, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        yield synchronizerStart();
        expect(yield allSyncTargetItemsEncrypted()).toBe(true);
    })));
    it('should upload encrypted resource, but it should not mark the blob as encrypted locally', (() => __awaiter(this, void 0, void 0, function* () {
        while (insideBeforeEach)
            yield time_1.default.msleep(100);
        const folder1 = yield Folder.save({ title: 'folder1' });
        const note1 = yield Note.save({ title: 'ma note', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        const masterKey = yield loadEncryptionMasterKey();
        yield encryptionService().enableEncryption(masterKey, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        yield synchronizerStart();
        const resource1 = (yield Resource.all())[0];
        expect(resource1.encryption_blob_encrypted).toBe(0);
    })));
    it('should create remote items with UTF-8 content', (() => __awaiter(this, void 0, void 0, function* () {
        const folder = yield Folder.save({ title: 'Fahrräder' });
        yield Note.save({ title: 'Fahrräder', body: 'Fahrräder', parent_id: folder.id });
        const all = yield allNotesFolders();
        yield synchronizerStart();
        yield localNotesFoldersSameAsRemote(all, expect);
    })));
    it('should update remote items but not pull remote changes', (() => __awaiter(this, void 0, void 0, function* () {
        const folder = yield Folder.save({ title: 'folder1' });
        const note = yield Note.save({ title: 'un', parent_id: folder.id });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield Note.save({ title: 'deux', parent_id: folder.id });
        yield synchronizerStart();
        yield switchClient(1);
        yield Note.save({ title: 'un UPDATE', id: note.id });
        yield synchronizerStart(null, { syncSteps: ['update_remote'] });
        const all = yield allNotesFolders();
        expect(all.length).toBe(2);
        yield switchClient(2);
        yield synchronizerStart();
        const note2 = yield Note.load(note.id);
        expect(note2.title).toBe('un UPDATE');
    })));
    it('should create a new Welcome notebook on each client', (() => __awaiter(this, void 0, void 0, function* () {
        // Create the Welcome items on two separate clients
        yield WelcomeUtils.createWelcomeItems();
        yield synchronizerStart();
        yield switchClient(2);
        yield WelcomeUtils.createWelcomeItems();
        const beforeFolderCount = (yield Folder.all()).length;
        const beforeNoteCount = (yield Note.all()).length;
        expect(beforeFolderCount === 1).toBe(true);
        expect(beforeNoteCount > 1).toBe(true);
        yield synchronizerStart();
        const afterFolderCount = (yield Folder.all()).length;
        const afterNoteCount = (yield Note.all()).length;
        expect(afterFolderCount).toBe(beforeFolderCount * 2);
        expect(afterNoteCount).toBe(beforeNoteCount * 2);
        // Changes to the Welcome items should be synced to all clients
        const f1 = (yield Folder.all())[0];
        yield Folder.save({ id: f1.id, title: 'Welcome MOD' });
        yield synchronizerStart();
        yield switchClient(1);
        yield synchronizerStart();
        const f1_1 = yield Folder.load(f1.id);
        expect(f1_1.title).toBe('Welcome MOD');
    })));
    it('should not save revisions when updating a note via sync', (() => __awaiter(this, void 0, void 0, function* () {
        // When a note is updated, a revision of the original is created.
        // Here, on client 1, the note is updated for the first time, however since it is
        // via sync, we don't create a revision - that revision has already been created on client
        // 2 and is going to be synced.
        const n1 = yield Note.save({ title: 'testing' });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield Note.save({ id: n1.id, title: 'mod from client 2' });
        yield revisionService().collectRevisions();
        const allRevs1 = yield Revision.allByType(BaseModel_1.default.TYPE_NOTE, n1.id);
        expect(allRevs1.length).toBe(1);
        yield synchronizerStart();
        yield switchClient(1);
        yield synchronizerStart();
        const allRevs2 = yield Revision.allByType(BaseModel_1.default.TYPE_NOTE, n1.id);
        expect(allRevs2.length).toBe(1);
        expect(allRevs2[0].id).toBe(allRevs1[0].id);
    })));
    it('should not save revisions when deleting a note via sync', (() => __awaiter(this, void 0, void 0, function* () {
        const n1 = yield Note.save({ title: 'testing' });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield Note.delete(n1.id);
        yield revisionService().collectRevisions(); // REV 1
        {
            const allRevs = yield Revision.allByType(BaseModel_1.default.TYPE_NOTE, n1.id);
            expect(allRevs.length).toBe(1);
        }
        yield synchronizerStart();
        yield switchClient(1);
        yield synchronizerStart(); // The local note gets deleted here, however a new rev is *not* created
        {
            const allRevs = yield Revision.allByType(BaseModel_1.default.TYPE_NOTE, n1.id);
            expect(allRevs.length).toBe(1);
        }
        const notes = yield Note.all();
        expect(notes.length).toBe(0);
    })));
    it('should not save revisions when an item_change has been generated as a result of a sync', (() => __awaiter(this, void 0, void 0, function* () {
        // When a note is modified an item_change object is going to be created. This
        // is used for example to tell the search engine, when note should be indexed. It is
        // also used by the revision service to tell what note should get a new revision.
        // When a note is modified via sync, this item_change object is also created. The issue
        // is that we don't want to create revisions for these particular item_changes, because
        // such revision has already been created on another client (whatever client initially
        // modified the note), and that rev is going to be synced.
        //
        // So in the end we need to make sure that we don't create these unecessary additional revisions.
        const n1 = yield Note.save({ title: 'testing' });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield Note.save({ id: n1.id, title: 'mod from client 2' });
        yield revisionService().collectRevisions();
        yield synchronizerStart();
        yield switchClient(1);
        yield synchronizerStart();
        {
            const allRevs = yield Revision.allByType(BaseModel_1.default.TYPE_NOTE, n1.id);
            expect(allRevs.length).toBe(1);
        }
        yield revisionService().collectRevisions();
        {
            const allRevs = yield Revision.allByType(BaseModel_1.default.TYPE_NOTE, n1.id);
            expect(allRevs.length).toBe(1);
        }
    })));
    it('should handle case when new rev is created on client, then older rev arrives later via sync', (() => __awaiter(this, void 0, void 0, function* () {
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
        // Note: this test seems to be a bit shaky because it doesn't work if the synchronizer
        // context is passed around (via synchronizerStart()), but it should.
        const n1 = yield Note.save({ title: 'note' });
        yield Note.save({ id: n1.id, title: 'note REV1' });
        yield revisionService().collectRevisions(); // REV1
        expect((yield Revision.allByType(BaseModel_1.default.TYPE_NOTE, n1.id)).length).toBe(1);
        yield synchronizer().start();
        yield switchClient(2);
        synchronizer().testingHooks_ = ['skipRevisions'];
        yield synchronizer().start();
        synchronizer().testingHooks_ = [];
        yield Note.save({ id: n1.id, title: 'note REV2' });
        yield revisionService().collectRevisions(); // REV2
        expect((yield Revision.allByType(BaseModel_1.default.TYPE_NOTE, n1.id)).length).toBe(1);
        yield synchronizer().start(); // Sync the rev that had been skipped above with skipRevisions
        const revisions = yield Revision.allByType(BaseModel_1.default.TYPE_NOTE, n1.id);
        expect(revisions.length).toBe(2);
        expect((yield revisionService().revisionNote(revisions, 0)).title).toBe('note REV1');
        expect((yield revisionService().revisionNote(revisions, 1)).title).toBe('note REV2');
    })));
    it('should not download resources over the limit', (() => __awaiter(this, void 0, void 0, function* () {
        const note1 = yield Note.save({ title: 'note' });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        yield synchronizer().start();
        yield switchClient(2);
        const previousMax = synchronizer().maxResourceSize_;
        synchronizer().maxResourceSize_ = 1;
        yield synchronizerStart();
        synchronizer().maxResourceSize_ = previousMax;
        const syncItems = yield BaseItem.allSyncItems(syncTargetId());
        expect(syncItems.length).toBe(2);
        expect(syncItems[1].item_location).toBe(BaseItem.SYNC_ITEM_LOCATION_REMOTE);
        expect(syncItems[1].sync_disabled).toBe(1);
    })));
    it('should not upload a resource if it has not been fetched yet', (() => __awaiter(this, void 0, void 0, function* () {
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
        const note1 = yield Note.save({ title: 'note' });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        const resource = (yield Resource.all())[0];
        yield Resource.setLocalState(resource.id, { fetch_status: Resource.FETCH_STATUS_IDLE });
        yield synchronizerStart();
        expect((yield remoteResources()).length).toBe(0);
        yield Resource.setLocalState(resource.id, { fetch_status: Resource.FETCH_STATUS_DONE });
        yield synchronizerStart();
        expect((yield remoteResources()).length).toBe(1);
    })));
    it('should decrypt the resource metadata, but not try to decrypt the file, if it is not present', (() => __awaiter(this, void 0, void 0, function* () {
        const note1 = yield Note.save({ title: 'note' });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        const masterKey = yield loadEncryptionMasterKey();
        yield encryptionService().enableEncryption(masterKey, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        yield synchronizerStart();
        expect(yield allSyncTargetItemsEncrypted()).toBe(true);
        yield switchClient(2);
        yield synchronizerStart();
        Setting_1.default.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        yield decryptionWorker().start();
        let resource = (yield Resource.all())[0];
        expect(!!resource.encryption_applied).toBe(false);
        expect(!!resource.encryption_blob_encrypted).toBe(true);
        const resourceFetcher = new ResourceFetcher(() => { return synchronizer().api(); });
        yield resourceFetcher.start();
        yield resourceFetcher.waitForAllFinished();
        const ls = yield Resource.localState(resource);
        expect(ls.fetch_status).toBe(Resource.FETCH_STATUS_DONE);
        yield decryptionWorker().start();
        resource = (yield Resource.all())[0];
        expect(!!resource.encryption_blob_encrypted).toBe(false);
    })));
    it('should not create revisions when item is modified as a result of decryption', (() => __awaiter(this, void 0, void 0, function* () {
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
        yield Note.save({ title: 'ma note', updated_time: dateInPast, created_time: dateInPast }, { autoTimestamp: false });
        const masterKey = yield loadEncryptionMasterKey();
        yield encryptionService().enableEncryption(masterKey, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        Setting_1.default.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        yield decryptionWorker().start();
        yield revisionService().collectRevisions();
        expect((yield Revision.all()).length).toBe(0);
    })));
    it('should stop trying to decrypt item after a few attempts', (() => __awaiter(this, void 0, void 0, function* () {
        let hasThrown;
        const note = yield Note.save({ title: 'ma note' });
        const masterKey = yield loadEncryptionMasterKey();
        yield encryptionService().enableEncryption(masterKey, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        // First, simulate a broken note and check that the decryption worker
        // gives up decrypting after a number of tries. This is mainly relevant
        // for data that crashes the mobile application - we don't want to keep
        // decrypting these.
        const encryptedNote = yield Note.load(note.id);
        const goodCipherText = encryptedNote.encryption_cipher_text;
        yield Note.save({ id: note.id, encryption_cipher_text: 'doesntlookright' });
        Setting_1.default.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        hasThrown = yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield decryptionWorker().start({ errorHandler: 'throw' }); }));
        expect(hasThrown).toBe(true);
        hasThrown = yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield decryptionWorker().start({ errorHandler: 'throw' }); }));
        expect(hasThrown).toBe(true);
        // Third time, an error is logged and no error is thrown
        hasThrown = yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield decryptionWorker().start({ errorHandler: 'throw' }); }));
        expect(hasThrown).toBe(false);
        const disabledItems = yield decryptionWorker().decryptionDisabledItems();
        expect(disabledItems.length).toBe(1);
        expect(disabledItems[0].id).toBe(note.id);
        expect((yield kvStore().all()).length).toBe(1);
        yield kvStore().clear();
        // Now check that if it fails once but succeed the second time, the note
        // is correctly decrypted and the counters are cleared.
        hasThrown = yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield decryptionWorker().start({ errorHandler: 'throw' }); }));
        expect(hasThrown).toBe(true);
        yield Note.save({ id: note.id, encryption_cipher_text: goodCipherText });
        hasThrown = yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield decryptionWorker().start({ errorHandler: 'throw' }); }));
        expect(hasThrown).toBe(false);
        const decryptedNote = yield Note.load(note.id);
        expect(decryptedNote.title).toBe('ma note');
        expect((yield kvStore().all()).length).toBe(0);
        expect((yield decryptionWorker().decryptionDisabledItems()).length).toBe(0);
    })));
    it('should not wipe out user data when syncing with an empty target', (() => __awaiter(this, void 0, void 0, function* () {
        // Only these targets support the wipeOutFailSafe flag (in other words, the targets that use basicDelta)
        if (!['nextcloud', 'memory', 'filesystem', 'amazon_s3'].includes(syncTargetName()))
            return;
        for (let i = 0; i < 10; i++)
            yield Note.save({ title: 'note' });
        Setting_1.default.setValue('sync.wipeOutFailSafe', true);
        yield synchronizerStart();
        yield fileApi().clearRoot(); // oops
        yield synchronizerStart();
        expect((yield Note.all()).length).toBe(10); // but since the fail-safe if on, the notes have not been deleted
        Setting_1.default.setValue('sync.wipeOutFailSafe', false); // Now switch it off
        yield synchronizerStart();
        expect((yield Note.all()).length).toBe(0); // Since the fail-safe was off, the data has been cleared
        // Handle case where the sync target has been wiped out, then the user creates one note and sync.
        for (let i = 0; i < 10; i++)
            yield Note.save({ title: 'note' });
        Setting_1.default.setValue('sync.wipeOutFailSafe', true);
        yield synchronizerStart();
        yield fileApi().clearRoot();
        yield Note.save({ title: 'ma note encore' });
        yield synchronizerStart();
        expect((yield Note.all()).length).toBe(11);
    })));
    it('should not encrypt notes that are shared', (() => __awaiter(this, void 0, void 0, function* () {
        Setting_1.default.setValue('encryption.enabled', true);
        yield loadEncryptionMasterKey();
        const folder1 = yield Folder.save({ title: 'folder1' });
        const note1 = yield Note.save({ title: 'un', parent_id: folder1.id });
        let note2 = yield Note.save({ title: 'deux', parent_id: folder1.id });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield switchClient(1);
        const origNote2 = Object.assign({}, note2);
        yield BaseItem.updateShareStatus(note2, true);
        note2 = yield Note.load(note2.id);
        // Sharing a note should not modify the timestamps
        expect(note2.user_updated_time).toBe(origNote2.user_updated_time);
        expect(note2.user_created_time).toBe(origNote2.user_created_time);
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        // The shared note should be decrypted
        const note2_2 = yield Note.load(note2.id);
        expect(note2_2.title).toBe('deux');
        expect(note2_2.is_shared).toBe(1);
        // The non-shared note should be encrypted
        const note1_2 = yield Note.load(note1.id);
        expect(note1_2.title).toBe('');
    })));
});
//# sourceMappingURL=Synchronizer.js.map