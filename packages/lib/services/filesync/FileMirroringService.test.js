"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Note_1 = require("../../models/Note");
const test_utils_1 = require("../../testing/test-utils");
const FileMirroringService_1 = require("./FileMirroringService");
const path_1 = require("path");
const fs = require("fs-extra");
const redux_1 = require("redux");
const reducer_1 = require("../../reducer");
const BaseItem_1 = require("../../models/BaseItem");
const eventManager_1 = require("../../eventManager");
const Folder_1 = require("../../models/Folder");
const createFilesFromPathRecord_1 = require("../../utils/pathRecord/createFilesFromPathRecord");
const BaseModel_1 = require("../../BaseModel");
const verifyDirectoryMatches_1 = require("../../utils/pathRecord/verifyDirectoryMatches");
const waitForNoteChange = (itemMatcher) => {
    return new Promise(resolve => {
        const onResolve = () => {
            eventManager_1.default.off(eventManager_1.EventName.ItemChange, eventHandler);
            resolve();
        };
        const eventHandler = async (event) => {
            if (event.itemType !== BaseModel_1.ModelType.Note)
                return;
            if (!itemMatcher) {
                onResolve();
            }
            else if (itemMatcher(await Note_1.default.load(event.itemId))) {
                onResolve();
            }
        };
        eventManager_1.default.on(eventManager_1.EventName.ItemChange, eventHandler);
    });
};
const waitForTestNoteToBeWritten = async (parentDir) => {
    // Push a new writeFile task to the end of the action queue and wait for it.
    const waitForActionsToComplete = waitForNoteChange(item => item.body === 'waitForActionsToComplete');
    await fs.writeFile((0, path_1.join)(parentDir, 'waitForQueue.md'), 'waitForActionsToComplete', 'utf8');
    await waitForActionsToComplete;
};
let store;
describe('FileMirroringService.watch', () => {
    beforeEach(async () => {
        await (0, test_utils_1.setupDatabaseAndSynchronizer)(1);
        await (0, test_utils_1.switchClient)(1);
        const testReducer = (state = reducer_1.defaultState, action) => {
            return (0, reducer_1.default)(state, action);
        };
        store = (0, redux_1.createStore)(testReducer);
        BaseItem_1.default.dispatch = store.dispatch;
    });
    afterEach(async () => {
        await FileMirroringService_1.default.instance().reset();
    });
    test('should create notes and folders locally when created in an initially-empty, watched remote folder', async () => {
        const tempDir = await (0, test_utils_1.createTempDir)();
        await FileMirroringService_1.default.instance().mirrorFolder(tempDir, '');
        let changeListener = waitForNoteChange();
        await fs.writeFile((0, path_1.join)(tempDir, 'a.md'), 'This is a test...', 'utf8');
        await changeListener;
        expect((await Note_1.default.loadByTitle('a')).body).toBe('This is a test...');
        changeListener = waitForNoteChange();
        await fs.writeFile((0, path_1.join)(tempDir, 'b.md'), '---\ntitle: Title\n---\n\nThis is another test...', 'utf8');
        await changeListener;
        expect((await Note_1.default.loadByTitle('Title')).body).toBe('This is another test...');
        changeListener = waitForNoteChange();
        // Create both a test folder and a test note -- creating a new folder doesn't trigger an item change
        // event.
        await fs.mkdir((0, path_1.join)(tempDir, 'folder'));
        await fs.writeFile((0, path_1.join)(tempDir, 'note.md'), 'A test note.', 'utf8');
        await changeListener;
        const subfolder = await Folder_1.default.loadByTitle('folder');
        expect(subfolder).toMatchObject({ title: 'folder' });
        changeListener = waitForNoteChange();
        await fs.writeFile((0, path_1.join)(tempDir, 'folder', 'test_note.md'), 'A note in a folder', 'utf8');
        await changeListener;
        expect(await Note_1.default.loadByTitle('test_note')).toMatchObject({ body: 'A note in a folder', parent_id: subfolder.id });
    });
    test('should modify items locally when changed in a watched, non-empty remote folder', async () => {
        const tempDir = await (0, test_utils_1.createTempDir)();
        await (0, createFilesFromPathRecord_1.default)(tempDir, {
            'a.md': '---\ntitle: A test\n---',
            'b.md': '---\ntitle: Another test\n---\n\n# Content',
            'test/foo/c.md': 'Another note',
        });
        await FileMirroringService_1.default.instance().mirrorFolder(tempDir, '');
        expect(await Note_1.default.loadByTitle('A test')).toMatchObject({ body: '', parent_id: '' });
        const changeListener = waitForNoteChange(note => note.body === 'New content');
        await fs.writeFile((0, path_1.join)(tempDir, 'a.md'), '---\ntitle: A test\n---\n\nNew content', 'utf8');
        await changeListener;
        await waitForTestNoteToBeWritten(tempDir);
        expect(await Note_1.default.loadByTitle('A test')).toMatchObject({ body: 'New content', parent_id: '' });
    });
    test('should move notes when moved in a watched folder', async () => {
        const tempDir = await (0, test_utils_1.createTempDir)();
        await (0, createFilesFromPathRecord_1.default)(tempDir, {
            'a.md': '---\ntitle: A test\n---',
            'test/foo/c.md': 'Another note',
        });
        await FileMirroringService_1.default.instance().mirrorFolder(tempDir, '');
        const testFolderId = (await Folder_1.default.loadByTitle('test')).id;
        const noteId = (await Note_1.default.loadByTitle('A test')).id;
        await fs.move((0, path_1.join)(tempDir, 'a.md'), (0, path_1.join)(tempDir, 'test', 'a.md'));
        await waitForTestNoteToBeWritten(tempDir);
        const movedNote = await Note_1.default.loadByTitle('A test');
        expect(movedNote).toMatchObject({ parent_id: testFolderId, id: noteId });
    });
    test('should move folders locally when moved in a watched folder', async () => {
        const tempDir = await (0, test_utils_1.createTempDir)();
        await (0, createFilesFromPathRecord_1.default)(tempDir, {
            'testFolder1/a.md': 'Note A',
            'testFolder2/b.md': 'Note B',
            'testFolder2/testFolder3/c.md': 'Note C',
        });
        await FileMirroringService_1.default.instance().mirrorFolder(tempDir, '');
        const moveItemC = waitForNoteChange(item => item.body === 'Note C');
        await fs.move((0, path_1.join)(tempDir, 'testFolder2'), (0, path_1.join)(tempDir, 'testFolder1', 'testFolder2'));
        await moveItemC;
        await waitForTestNoteToBeWritten(tempDir);
        const testFolder1 = await Folder_1.default.loadByTitle('testFolder1');
        const testFolder2 = await Folder_1.default.loadByTitle('testFolder2');
        expect(testFolder2.parent_id).toBe(testFolder1.id);
        const testFolder3 = await Folder_1.default.loadByTitle('testFolder3');
        expect(testFolder3.parent_id).toBe(testFolder2.id);
        const noteC = await Note_1.default.loadByTitle('c');
        expect(noteC.parent_id).toBe(testFolder3.id);
    });
    test('should update notes remotely when updated locally', async () => {
        const tempDir = await (0, test_utils_1.createTempDir)();
        const note = await Note_1.default.save({ title: 'Test note', body: '', parent_id: '' });
        const mirror = await FileMirroringService_1.default.instance().mirrorFolder(tempDir, '');
        await (0, verifyDirectoryMatches_1.default)(tempDir, {
            'Test note.md': `---\ntitle: Test note\nid: ${note.id}\n---\n\n`,
        });
        await Note_1.default.save({ title: 'Test note', body: 'New body', id: note.id });
        await mirror.waitForIdle();
        await (0, verifyDirectoryMatches_1.default)(tempDir, {
            'Test note.md': `---\ntitle: Test note\nid: ${note.id}\n---\n\nNew body`,
        });
    });
});
//# sourceMappingURL=FileMirroringService.test.js.map