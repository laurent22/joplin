import { join } from 'path';
import Note from '../../models/Note';
import { createTempDir } from '../../testing/test-utils';
import createFilesFromPathRecord from '../../utils/pathRecord/createFilesFromPathRecord';
import { mirrorAndWatchFolder, resetFolderMirror, setUpFolderMirror, waitForNoteChange, waitForTestNoteToBeWritten } from './utils/test-utils';
import * as fs from 'fs-extra';
import Folder from '../../models/Folder';
import directoryToPathRecord from '../../utils/pathRecord/directoryToPathRecord';

describe('FolderMirroringService.notes', () => {
	beforeEach(async () => {
		await setUpFolderMirror();
	});

	afterEach(async () => {
		await resetFolderMirror();
	});

	//
	// IDs
	//

	test('should assign IDs to notes that lack them on an initial sync', async () => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, {
			'a.md': '---\ntitle: A test\n---',
			'b.md': '---\ntitle: Another test\n---\n\n# Content',
			'c.md': '---\ntitle: Another test\nid: 0123456789abcdef0123456789abcdef---\n\n# This note already has an ID',
			'test/foo/c.md': 'Another note',
		});
		await mirrorAndWatchFolder(tempDir, '');
		expect(await directoryToPathRecord(tempDir)).toMatchSnapshot('should assign IDs to notes that lack them on an initial sync');

		await fs.writeFile(join(tempDir, 'new.md'), 'New file with no ID');
		await waitForTestNoteToBeWritten(tempDir);

		expect(await directoryToPathRecord(tempDir)).toMatchSnapshot('should assign IDs to new notes written while watching');
	});

	//
	// Syncing changes
	//

	test('should modify items locally when changed in a watched, non-empty remote folder', async () => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, {
			'a.md': '---\ntitle: A test\n---',
			'b.md': '---\ntitle: Another test\n---\n\n# Content',
			'test/foo/c.md': 'Another note',
		});
		await mirrorAndWatchFolder(tempDir, '');

		expect(await Note.loadByTitle('A test')).toMatchObject({ body: '', parent_id: '' });

		const changeListener = waitForNoteChange(note => note.body === 'New content');
		await fs.writeFile(join(tempDir, 'a.md'), '---\ntitle: A test\n---\n\nNew content', 'utf8');
		await changeListener;
		await waitForTestNoteToBeWritten(tempDir);

		expect(await Note.loadByTitle('A test')).toMatchObject({
			body: 'New content', parent_id: '',
		});
	});

	test('should move notes when moved in a watched folder', async () => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, {
			'a.md': '---\ntitle: A test\n---',
			'test/foo/c.md': 'Another note',
		});
		await mirrorAndWatchFolder(tempDir, '');


		const testFolderId = (await Folder.loadByTitle('test')).id;
		const noteId = (await Note.loadByTitle('A test')).id;

		await fs.move(join(tempDir, 'a.md'), join(tempDir, 'test', 'a.md'));

		await waitForTestNoteToBeWritten(tempDir);

		const movedNote = await Note.loadByTitle('A test');
		expect(movedNote).toMatchObject({ parent_id: testFolderId, id: noteId });
	});
});
