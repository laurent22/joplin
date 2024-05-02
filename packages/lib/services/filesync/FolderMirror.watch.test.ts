import Note from '../../models/Note';
import { createTempDir, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import FileMirroringService from './FolderMirror';
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

type ShouldMatchItemCallback = (item: NoteEntity)=> boolean;
const waitForNoteChange = (itemMatcher?: ShouldMatchItemCallback) => {
	return new Promise<void>(resolve => {
		const onResolve = () => {
			eventManager.off(EventName.ItemChange, eventHandler);
			resolve();
		};

		const eventHandler = async (event: ItemChangeEvent) => {
			if (event.eventType !== ModelType.Note) return;

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
};

let store: Store<AppState>;
describe('FileMirroringService.watch', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);

		const testReducer = (state = defaultState, action: unknown) => {
			return reducer(state, action);
		};
		store = createStore(testReducer);

		BaseItem.dispatch = store.dispatch;
	});

	test('should create notes and folders locally when created in an initially-empty, watched remote folder', async () => {
		const tempDir = await createTempDir();
		const service = new FileMirroringService(tempDir, '');
		await service.watch();

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

		await service.stopWatching();
	});

	test('should modify items locally when changed in a watched, non-empty remote folder', async () => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, {
			'a.md': '---\ntitle: A test\n---',
			'b.md': '---\ntitle: Another test\n---\n\n# Content',
			'test/foo/c.md': 'Another note',
		});
		const service = new FileMirroringService(tempDir, '');
		await service.fullSync();
		await service.watch();

		expect(await Note.loadByTitle('A test')).toMatchObject({ body: '', parent_id: '' });

		const changeListener = waitForNoteChange(note => note.body === 'New content');
		await fs.writeFile(join(tempDir, 'a.md'), '---\ntitle: A test\n---\n\nNew content', 'utf8');
		await changeListener;
		await waitForTestNoteToBeWritten(tempDir);

		expect(await Note.loadByTitle('A test')).toMatchObject({ body: 'New content', parent_id: '' });

		await service.stopWatching();
	});

	test('should move notes when moved in a watched folder', async () => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, {
			'a.md': '---\ntitle: A test\n---',
			'test/foo/c.md': 'Another note',
		});
		const service = new FileMirroringService(tempDir, '');
		await service.fullSync();
		await service.watch();

		const testFolderId = (await Folder.loadByTitle('test')).id;
		const noteId = (await Note.loadByTitle('A test')).id;

		await fs.move(join(tempDir, 'a.md'), join(tempDir, 'test', 'a.md'));

		await waitForTestNoteToBeWritten(tempDir);

		const movedNote = await Note.loadByTitle('A test');
		expect(movedNote).toMatchObject({ parent_id: testFolderId, id: noteId });

		await service.stopWatching();
	});

	test('should move folders when moved in a watched folder', async () => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, {
			'testFolder1/a.md': 'Note A',
			'testFolder2/b.md': 'Note B',
			'testFolder2/testFolder3/c.md': 'Note C',
		});

		const service = new FileMirroringService(tempDir, '');
		await service.fullSync();
		await service.watch();

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

		await service.stopWatching();
	});
});
