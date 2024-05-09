import Note from '../../models/Note';
import { createTempDir, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import FolderMirroringService from './FolderMirroringService';
import { join } from 'path';
import * as fs from 'fs-extra';
import { Store, createStore } from 'redux';
import reducer, { State as AppState, defaultState } from '../../reducer';
import BaseItem from '../../models/BaseItem';
import eventManager, { EventName, ItemChangeEvent } from '../../eventManager';
import Folder from '../../models/Folder';
import createFilesFromPathRecord from '../../utils/pathRecord/createFilesFromPathRecord';
import { NoteEntity } from '../database/types';
import { ModelType } from '../../BaseModel';
import verifyDirectoryMatches from '../../utils/pathRecord/verifyDirectoryMatches';

type ShouldMatchItemCallback = (item: NoteEntity)=> boolean;
const waitForNoteChange = (itemMatcher?: ShouldMatchItemCallback) => {
	return new Promise<void>(resolve => {
		const onResolve = () => {
			eventManager.off(EventName.ItemChange, eventHandler);
			resolve();
		};

		const eventHandler = async (event: ItemChangeEvent) => {
			if (event.itemType !== ModelType.Note) return;

			if (!itemMatcher) {
				onResolve();
			} else if (itemMatcher(await Note.load(event.itemId))) {
				onResolve();
			}
		};

		eventManager.on(EventName.ItemChange, eventHandler);
	});
};

const waitForTestNoteToBeWritten = async (parentDir: string) => {
	// Push a new writeFile task to the end of the action queue and wait for it.
	const waitForActionsToComplete = waitForNoteChange(item => item.body === 'waitForActionsToComplete');
	await fs.writeFile(join(parentDir, 'waitForQueue.md'), 'waitForActionsToComplete', 'utf8');
	await waitForActionsToComplete;

	const waitForDeleteAction = waitForNoteChange(item => item.body === 'waitForActionsToComplete');
	await fs.remove(join(parentDir, 'waitForQueue.md'));
	await waitForDeleteAction;
};

let store: Store<AppState>;
describe('FolderMirroringService', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);

		const testReducer = (state = defaultState, action: unknown) => {
			return reducer(state, action);
		};
		store = createStore(testReducer);

		BaseItem.dispatch = store.dispatch;

		// Needed for AsyncActionQueue
		jest.useRealTimers();
	});
	afterEach(async () => {
		await FolderMirroringService.instance().reset();
	});

	test('should create notes and folders locally when created in an initially-empty, watched remote folder', async () => {
		const tempDir = await createTempDir();
		await FolderMirroringService.instance().mirrorFolder(tempDir, '');

		let changeListener = waitForNoteChange();
		await fs.writeFile(join(tempDir, 'a.md'), 'This is a test...', 'utf8');
		await changeListener;

		expect((await Note.loadByTitle('a')).body).toBe('This is a test...');

		changeListener = waitForNoteChange();
		await fs.writeFile(join(tempDir, 'b.md'), '---\ntitle: Title\n---\n\nThis is another test...', 'utf8');
		await changeListener;

		expect((await Note.loadByTitle('Title')).body).toBe('This is another test...');

		changeListener = waitForNoteChange();
		// Create both a test folder and a test note -- creating a new folder doesn't trigger an item change
		// event.
		await fs.mkdir(join(tempDir, 'folder'));
		await fs.writeFile(join(tempDir, 'note.md'), 'A test note.', 'utf8');
		await changeListener;

		const subfolder = await Folder.loadByTitle('folder');
		expect(subfolder).toMatchObject({ title: 'folder' });

		changeListener = waitForNoteChange();
		await fs.writeFile(join(tempDir, 'folder', 'test_note.md'), 'A note in a folder', 'utf8');
		await changeListener;

		expect(await Note.loadByTitle('test_note')).toMatchObject({ body: 'A note in a folder', parent_id: subfolder.id });
	});

	test('should modify items locally when changed in a watched, non-empty remote folder', async () => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, {
			'a.md': '---\ntitle: A test\n---',
			'b.md': '---\ntitle: Another test\n---\n\n# Content',
			'test/foo/c.md': 'Another note',
		});
		await FolderMirroringService.instance().mirrorFolder(tempDir, '');

		expect(await Note.loadByTitle('A test')).toMatchObject({ body: '', parent_id: '' });

		const changeListener = waitForNoteChange(note => note.body === 'New content');
		await fs.writeFile(join(tempDir, 'a.md'), '---\ntitle: A test\n---\n\nNew content', 'utf8');
		await changeListener;
		await waitForTestNoteToBeWritten(tempDir);

		expect(await Note.loadByTitle('A test')).toMatchObject({ body: 'New content', parent_id: '' });
	});

	test('should move notes when moved in a watched folder', async () => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, {
			'a.md': '---\ntitle: A test\n---',
			'test/foo/c.md': 'Another note',
		});
		await FolderMirroringService.instance().mirrorFolder(tempDir, '');

		const testFolderId = (await Folder.loadByTitle('test')).id;
		const noteId = (await Note.loadByTitle('A test')).id;

		await fs.move(join(tempDir, 'a.md'), join(tempDir, 'test', 'a.md'));

		await waitForTestNoteToBeWritten(tempDir);

		const movedNote = await Note.loadByTitle('A test');
		expect(movedNote).toMatchObject({ parent_id: testFolderId, id: noteId });
	});

	test('should move folders locally when moved in a watched folder', async () => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, {
			'testFolder1/a.md': 'Note A',
			'testFolder2/b.md': 'Note B',
			'testFolder2/testFolder3/c.md': 'Note C',
		});

		const watcher = await FolderMirroringService.instance().mirrorFolder(tempDir, '');
		await watcher.waitForIdle();

		const moveItemC = waitForNoteChange(item => item.body === 'Note C');
		await fs.move(join(tempDir, 'testFolder2'), join(tempDir, 'testFolder1', 'testFolder2'));
		await moveItemC;

		await waitForTestNoteToBeWritten(tempDir);

		const testFolder1 = await Folder.loadByTitle('testFolder1');
		const testFolder2 = await Folder.loadByTitle('testFolder2');
		expect(testFolder2.parent_id).toBe(testFolder1.id);

		const testFolder3 = await Folder.loadByTitle('testFolder3');
		expect(testFolder3.parent_id).toBe(testFolder2.id);

		const noteC = await Note.loadByTitle('c');
		expect(noteC.parent_id).toBe(testFolder3.id);

		// None of the folders should be deleted by the move.
		expect(testFolder1.deleted_time).toBe(0);
		expect(testFolder2.deleted_time).toBe(0);
		expect(testFolder3.deleted_time).toBe(0);
		expect(noteC.deleted_time).toBe(0);
	});

	test('should update notes remotely when updated locally', async () => {
		const tempDir = await createTempDir();

		const note = await Note.save({ title: 'Test note', body: '', parent_id: '' });
		const mirror = await FolderMirroringService.instance().mirrorFolder(tempDir, '');

		await verifyDirectoryMatches(tempDir, {
			'Test note.md': `---\ntitle: Test note\nid: ${note.id}\n---\n\n`,
		});

		await Note.save({ title: 'Test note', body: 'New body', id: note.id });
		await mirror.waitForIdle();

		await verifyDirectoryMatches(tempDir, {
			'Test note.md': `---\ntitle: Test note\nid: ${note.id}\n---\n\nNew body`,
		});
	});

	test('should rename folders locally when renamed remotely with .folder.yml', async () => {
		const tempDir = await createTempDir();
		const folder1 = await Folder.save({ title: 'Test', parent_id: '' });
		const folder2 = await Folder.save({ title: 'Test 2', parent_id: '' });
		const note1 = await Note.save({ parent_id: folder2.id, title: 'Note' });

		const mirror = await FolderMirroringService.instance().mirrorFolder(tempDir, '');

		await mirror.waitForIdle();
		await verifyDirectoryMatches(tempDir, {
			'Test/.folder.yml': `title: Test\nid: ${folder1.id}\n`,
			'Test 2/.folder.yml': `title: Test 2\nid: ${folder2.id}\n`,
			'Test 2/Note.md': `---\ntitle: Note\nid: ${note1.id}\n---\n\n`,
		});

		await fs.writeFile(join(tempDir, 'Test', '.folder.yml'), `title: Updated\nid: ${folder1.id}`, 'utf8');

		await waitForTestNoteToBeWritten(tempDir);
		await mirror.waitForIdle();

		expect(await Folder.load(folder1.id)).toMatchObject({
			parent_id: '',
			title: 'Updated',
			deleted_time: 0, // Should not be deleted
		});

		await verifyDirectoryMatches(tempDir, {
			'Updated/.folder.yml': `title: Updated\nid: ${folder1.id}`,
			'Test 2/.folder.yml': `title: Test 2\nid: ${folder2.id}\n`,
			'Test 2/Note.md': `---\ntitle: Note\nid: ${note1.id}\n---\n\n`,
		});
	});

	test('should rename notes remotely when renamed locally', async () => {
		const tempDir = await createTempDir();
		const folder = await Folder.save({ title: 'Test folder', parent_id: '' });
		const note1 = await Note.save({ parent_id: folder.id, title: 'Note' });
		const note2 = await Note.save({ parent_id: folder.id, title: 'Note' });
		const note3 = await Note.save({ parent_id: folder.id, title: 'Test note' });

		const mirror = await FolderMirroringService.instance().mirrorFolder(tempDir, '');
		await mirror.waitForIdle();

		await verifyDirectoryMatches(tempDir, {
			'Test folder/.folder.yml': `title: Test folder\nid: ${folder.id}\n`,
			'Test folder/Note.md': `---\ntitle: Note\nid: ${note1.id}\n---\n\n`,
			'Test folder/Note (1).md': `---\ntitle: Note\nid: ${note2.id}\n---\n\n`,
			'Test folder/Test note.md': `---\ntitle: Test note\nid: ${note3.id}\n---\n\n`,
		});

		let renameTask = waitForNoteChange();
		await Note.save({ id: note1.id, title: 'Renamed' });
		await renameTask;
		await mirror.waitForIdle();

		await verifyDirectoryMatches(tempDir, {
			'Test folder/.folder.yml': `title: Test folder\nid: ${folder.id}\n`,
			'Test folder/Renamed.md': `---\ntitle: Renamed\nid: ${note1.id}\n---\n\n`,
			'Test folder/Note (1).md': `---\ntitle: Note\nid: ${note2.id}\n---\n\n`,
			'Test folder/Test note.md': `---\ntitle: Test note\nid: ${note3.id}\n---\n\n`,
		});

		renameTask = waitForNoteChange();
		await Note.save({ id: note2.id, title: 'Renamed' });
		await renameTask;
		renameTask = waitForNoteChange();
		await Note.save({ id: note3.id, title: 'Renamed' });
		await renameTask;
		await mirror.waitForIdle();

		await verifyDirectoryMatches(tempDir, {
			'Test folder/.folder.yml': `title: Test folder\nid: ${folder.id}\n`,
			'Test folder/Renamed.md': `---\ntitle: Renamed\nid: ${note1.id}\n---\n\n`,
			'Test folder/Renamed (1).md': `---\ntitle: Renamed\nid: ${note2.id}\n---\n\n`,
			'Test folder/Renamed (2).md': `---\ntitle: Renamed\nid: ${note3.id}\n---\n\n`,
		});

		renameTask = waitForNoteChange();
		await Note.save({ id: note3.id, parent_id: '' });
		await renameTask;
		await mirror.waitForIdle();

		await verifyDirectoryMatches(tempDir, {
			'Test folder/.folder.yml': `title: Test folder\nid: ${folder.id}\n`,
			'Test folder/Renamed.md': `---\ntitle: Renamed\nid: ${note1.id}\n---\n\n`,
			'Test folder/Renamed (1).md': `---\ntitle: Renamed\nid: ${note2.id}\n---\n\n`,
			'Renamed.md': `---\ntitle: Renamed\nid: ${note3.id}\n---\n\n`,
		});
	});

	test('should add metadata to folders when created remotely', async () => {
		const tempDir = await createTempDir();
		const mirror = await FolderMirroringService.instance().mirrorFolder(tempDir, '');
		await mirror.waitForIdle();

		await fs.mkdir(join(tempDir, 'Test'));
		await waitForTestNoteToBeWritten(tempDir);
		await mirror.waitForIdle();

		const folder = await Folder.loadByTitle('Test');
		expect(folder).toMatchObject({ title: 'Test' });

		await verifyDirectoryMatches(tempDir, {
			'Test/.folder.yml': `title: Test\nid: ${folder.id}\n`,
		});
	});

	// TODO: Can we assign a new ID in this case? If so, it might require a heuristic to determine
	// whether or not the file is being duplicated or moved.
	test('should delete originals when a note with an existing ID is created', async () => {
		const tempDir = await createTempDir();
		const noteId = (await Note.save({ title: 'note', parent_id: '' })).id;

		const mirror = await FolderMirroringService.instance().mirrorFolder(tempDir, '');
		await mirror.waitForIdle();

		await verifyDirectoryMatches(tempDir, {
			'note.md': `---\ntitle: note\nid: ${noteId}\n---\n\n`,
		});

		const noteChangeTask = waitForNoteChange();
		await fs.writeFile(join(tempDir, 'Same-id note.md'), `---\ntitle: Same-id note\nid: ${noteId}\n---\n\nTest`, 'utf-8');
		await noteChangeTask;

		const noteCopy = await Note.loadByTitle('Same-id note');
		await verifyDirectoryMatches(tempDir, {
			'Same-id note.md': `---\ntitle: Same-id note\nid: ${noteCopy.id}\n---\n\nTest`,
		});
		expect(noteCopy.id).toBe(noteId);
	});

	test('should replace links in a file when changed in its note', async () => {
		const tempDir = await createTempDir();
		const note1Id = (await Note.save({ title: 'note1', parent_id: '', body: 'Test' })).id;
		const note2Id = (await Note.save({ title: 'note2', parent_id: '', body: `[Test](:/${note1Id})` })).id;
		const note3Id = (await Note.save({ title: 'note3', parent_id: '', body: `[Test](:/${note2Id})` })).id;

		const mirror = await FolderMirroringService.instance().mirrorFolder(tempDir, '');
		await mirror.waitForIdle();

		await Note.save({ id: note2Id, body: `[Test](:/${note3Id})` });

		await waitForTestNoteToBeWritten(tempDir);
		await mirror.waitForIdle();

		await verifyDirectoryMatches(tempDir, {
			'note1.md': `---\ntitle: note1\nid: ${note1Id}\n---\n\nTest`,
			'note2.md': `---\ntitle: note2\nid: ${note2Id}\n---\n\n[Test](./note3.md)`,
			'note3.md': `---\ntitle: note3\nid: ${note3Id}\n---\n\n[Test](./note2.md)`,
		});

		await Note.save({ id: note3Id, title: 'note3 updated' });

		await waitForTestNoteToBeWritten(tempDir);
		await mirror.waitForIdle();

		await verifyDirectoryMatches(tempDir, {
			'note1.md': `---\ntitle: note1\nid: ${note1Id}\n---\n\nTest`,
			'note2.md': `---\ntitle: note2\nid: ${note2Id}\n---\n\n[Test](./note3 updated.md)`,
			'note3 updated.md': `---\ntitle: note3 updated\nid: ${note3Id}\n---\n\n[Test](./note2.md)`,
		});
	});

	test('should replace links in a note when changed in its file', async () => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, {
			'note1.md': '---\ntitle: note1\n---\n\n# Test\n\n[other note](./foo/a.md)',
			'note2.md': '---\ntitle: note2\n---\n\n# Test\n\n[Another note](./foo/a.md), and [another](./note1.md)',
			'foo/a.md': '---\ntitle: NoteA\n---\n\n[first](../note.md)',
			'foo/b.md': '---\ntitle: NoteB\n---\n\n[first](./a.md)',
		});

		const mirror = await FolderMirroringService.instance().mirrorFolder(tempDir, '');
		await mirror.waitForIdle();

		const note1 = await Note.loadByTitle('note1');
		const noteA = await Note.loadByTitle('NoteA');
		expect(note1).toMatchObject({
			parent_id: '',
			title: 'note1',
			body: `# Test\n\n[other note](:/${noteA.id})`,
		});

		const note2 = await Note.loadByTitle('note2');

		// Updating links in a file should also update the links in the database
		await fs.writeFile(join(tempDir, 'note2.md'), `---\ntitle: note2\nid: ${note2.id}\n---\n\n[Test](./foo/b.md), [Test 2](./foo/a.md)`, 'utf8');
		await waitForTestNoteToBeWritten(tempDir);
		await mirror.waitForIdle();

		const noteB = await Note.loadByTitle('NoteB');
		expect(await Note.load(note2.id)).toMatchObject({
			parent_id: '',
			title: 'note2',
			body: `[Test](:/${noteB.id}), [Test 2](:/${noteA.id})`,
		});

		await verifyDirectoryMatches(tempDir, {
			'note1.md': `---\ntitle: note1\nid: ${note1.id}\n---\n\n# Test\n\n[other note](./foo/a.md)`,
			'note2.md': `---\ntitle: note2\nid: ${note2.id}\n---\n\n[Test](./foo/b.md), [Test 2](./foo/a.md)`,
			'foo/a.md': `---\ntitle: NoteA\nid: ${noteA.id}\n---\n\n[first](../note.md)`,
			'foo/b.md': `---\ntitle: NoteB\nid: ${noteB.id}\n---\n\n[first](./a.md)`,
			'foo/.folder.yml': `title: foo\nid: ${noteB.parent_id}\n`,
		});
	});

	test('should replace links in a file when link target is renamed in the database', async () => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, {
			'note1.md': '---\ntitle: note1\n---\n\n[note a](./folder/a.md), [note b](./folder/b.md)',
			'folder/a.md': '---\ntitle: a\n---\n\n[first](../note1.md)',
			'folder/b.md': '---\ntitle: b\n---\n\n[first](./a.md)',
		});

		const mirror = await FolderMirroringService.instance().mirrorFolder(tempDir, '');
		await waitForTestNoteToBeWritten(tempDir);
		await mirror.waitForIdle();

		const folder = await Folder.loadByTitle('folder');
		const note1 = await Note.loadByTitle('note1');
		const noteA = await Note.loadByTitle('a');
		const noteB = await Note.loadByTitle('b');

		expect(note1).toMatchObject({
			title: 'note1',
			parent_id: '',
			body: `[note a](:/${noteA.id}), [note b](:/${noteB.id})`,
		});
		expect(noteB).toMatchObject({
			title: 'b',
			parent_id: folder.id,
			body: `[first](:/${noteA.id})`,
		});

		await Note.save({ id: noteB.id, title: 'c' });
		await Note.save({ id: noteB.id, title: 'note-c' });
		await mirror.waitForIdle();

		await verifyDirectoryMatches(tempDir, {
			'folder/a.md': `---\ntitle: a\nid: ${noteA.id}\n---\n\n[first](../note1.md)`,
			'folder/note-c.md': `---\ntitle: note-c\nid: ${noteB.id}\n---\n\n[first](./a.md)`,
			'folder/.folder.yml': `title: folder\nid: ${folder.id}\n`,
			'note1.md': `---\ntitle: note1\nid: ${note1.id}\n---\n\n[note a](./folder/a.md), [note b](./folder/note-c.md)`,
		});

		await Note.save({ id: noteA.id, title: 'note-a-test' });
		await waitForTestNoteToBeWritten(tempDir);
		await mirror.waitForIdle();

		await verifyDirectoryMatches(tempDir, {
			'folder/note-a-test.md': `---\ntitle: note-a-test\nid: ${noteA.id}\n---\n\n[first](../note1.md)`,
			'folder/note-c.md': `---\ntitle: note-c\nid: ${noteB.id}\n---\n\n[first](./note-a-test.md)`,
			'folder/.folder.yml': `title: folder\nid: ${folder.id}\n`,
			'note1.md': `---\ntitle: note1\nid: ${note1.id}\n---\n\n[note a](./folder/note-a-test.md), [note b](./folder/note-c.md)`,
		});
	});

	test('renaming a folder with .folder.yml should also rewrite links', async () => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, {
			'note1.md': '---\ntitle: note1\n---\n\n# Test\n\n[other note](./original/note2.md)',
			'original/note2.md': '---\ntitle: note2\n---\n\n[first](../note1.md)',
			'original/note3.md': '---\ntitle: note3\n---\n\n[second](./note2.md)',
			'original/sub/note4.md': '---\ntitle: note4\n---\n\n[second](../note2.md), [third](../note3.md)',
		});

		const mirror = await FolderMirroringService.instance().mirrorFolder(tempDir, '');

		await waitForTestNoteToBeWritten(tempDir);
		await mirror.waitForIdle();

		const note1 = await Note.loadByTitle('note1');
		const note2 = await Note.loadByTitle('note2');
		const note3 = await Note.loadByTitle('note3');
		const note4 = await Note.loadByTitle('note4');
		await fs.writeFile(join(tempDir, 'original', '.folder.yml'), `title: Renamed\nid: ${note2.parent_id}\n`);

		await waitForTestNoteToBeWritten(tempDir);
		await mirror.waitForIdle();

		const expectedDirectoryContent = {
			'note1.md': `---\ntitle: note1\nid: ${note1.id}\n---\n\n# Test\n\n[other note](./Renamed/note2.md)`,
			'Renamed/note2.md': `---\ntitle: note2\nid: ${note2.id}\n---\n\n[first](../note1.md)`,
			'Renamed/note3.md': `---\ntitle: note3\nid: ${note3.id}\n---\n\n[second](./note2.md)`,
			'Renamed/sub/note4.md': `---\ntitle: note4\nid: ${note4.id}\n---\n\n[second](../note2.md), [third](../note3.md)`,
			'Renamed/sub/.folder.yml': `title: sub\nid: ${note4.parent_id}\n`,
			'Renamed/.folder.yml': `title: Renamed\nid: ${note2.parent_id}\n`,
		};
		await verifyDirectoryMatches(tempDir, expectedDirectoryContent);

		// Shouldn't change after a full sync
		await mirror.fullSync();
		await verifyDirectoryMatches(tempDir, expectedDirectoryContent);
	});
});
