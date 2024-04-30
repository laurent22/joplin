import { readFile } from 'fs-extra';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import { createTempDir, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import FileMirroringService from './FileMirroringService';
import { join } from 'path';
import createFilesFromPathRecord from '../../utils/pathRecord/createFilesFromPathRecord';
import verifyDirectoryMatches from '../../utils/pathRecord/verifyDirectoryMatches';

describe('FileMirroringService', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should create notes in a local dir', async ()=> {
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const folder3 = await Folder.save({ title: 'folder3', parent_id: folder2.id });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id, body: 'Test' });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id, body: '# Heading' });
		const note3 = await Note.save({ title: 'note3', parent_id: folder3.id, is_todo: 1 });
		const note3Copy = await Note.save({ title: 'note3', parent_id: folder3.id });

		const tempDir = await createTempDir();
		const service = new FileMirroringService();

		await service.syncDir(tempDir, [], []);

		expect(await readFile(join(tempDir, folder1.title, `${note1.title}.md`), 'utf8')).toBe([
			'---',
			'title: note1',
			`id: ${note1.id}`,
			'---',
			'',
			'Test',
		].join('\n'));
		expect(await readFile(join(tempDir, folder1.title, `${note2.title}.md`), 'utf8')).toBe([
			'---',
			'title: note2',
			`id: ${note2.id}`,
			'---',
			'',
			'# Heading',
		].join('\n'));
		expect(await readFile(join(tempDir, folder2.title, folder3.title, `${note3.title}.md`), 'utf8')).toBe([
			'---',
			'title: note3',
			`id: ${note3.id}`,
			'completed?: no',
			'---',
			'',
			'',
		].join('\n'));
		expect(await readFile(join(tempDir, folder2.title, folder3.title, `${note3Copy.title} (1).md`), 'utf8')).toBe([
			'---',
			'title: note3',
			`id: ${note3Copy.id}`,
			'---',
			'',
			'',
		].join('\n'));
	});

	it('should import notes from a local dir', async () => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, {
			'test/a.md': '---\ntitle: A test\n---',
			'test/b.md': '---\ntitle: Another test\n---\nFoo',
			'test/foo/b.md': '---\ntitle: Another test (subfolder)\n---',
		});

		const service = new FileMirroringService();
		await service.syncDir(tempDir, [], []);

		const baseFolder = await Folder.loadByTitle('test');

		expect(baseFolder).toMatchObject({ title: 'test' });
		const noteA = await Note.loadByTitle('A test');
		expect(noteA).toMatchObject({
			is_todo: 0,
			title: 'A test',
			parent_id: baseFolder.id,
			body: '',
		});
		const noteB = await Note.loadByTitle('Another test');
		expect(noteB).toMatchObject({
			is_todo: 0,
			title: 'Another test',
			parent_id: baseFolder.id,
			body: 'Foo',
		});

		const subFolder = await Folder.loadByTitle('foo');

		const noteB2 = await Note.loadByTitle('Another test (subfolder)');
		expect(noteB2).toMatchObject({
			is_todo: 0,
			title: 'Another test (subfolder)',
			parent_id: subFolder.id,
			body: '',
		});

		await verifyDirectoryMatches(tempDir, {
			'test/a.md': `---\ntitle: A test\nid: ${noteA.id}\n---\n\n`,
			'test/b.md': `---\ntitle: Another test\nid: ${noteB.id}\n---\n\nFoo`,
			'test/foo/b.md': `---\ntitle: Another test (subfolder)\nid: ${noteB2.id}\n---\n\n`,
		});
	});

	// it('should apply changes made to a local dir to notes', async () => {
	// 	;
	// });

	// it('should delete notes in dir when deleted in DB', async () => {
	// 	;
	// });

	// it('should create folders locally when created remotely', async () => {
	// 	;
	// });

	// it('should remove folders locally when removed remotely', async () => {
	// 	;
	// });

	// TODO: test notes with duplicate names
	// TODO: test folder with duplicate names

});
