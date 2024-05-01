import { readFile } from 'fs-extra';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import { createTempDir, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import FileMirroringService from './FileMirroringService';
import { extname, join } from 'path';
import createFilesFromPathRecord from '../../utils/pathRecord/createFilesFromPathRecord';
import verifyDirectoryMatches from '../../utils/pathRecord/verifyDirectoryMatches';
import * as fs from 'fs-extra';
import shim from '../../shim';

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
			'test/.folder.yml': `title: ${baseFolder.title}\nid: ${baseFolder.id}\n`,
			'test/foo/.folder.yml': `title: ${subFolder.title}\nid: ${subFolder.id}\n`,
		});
	});

	it('should handle the case where a note has no or empty frontmatter', async () => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, {
			'testFolder/a note.md': 'This is a test note with no frontmatter.',
			'testFolder/empty frontmatter.md': '---\n---\nTest.',
		});

		const service = new FileMirroringService();
		await service.syncDir(tempDir, [], []);

		const parentFolder = await Folder.loadByTitle('testFolder');
		const note = await Note.loadByTitle('a note');
		expect(note).toMatchObject({
			title: 'a note',
			body: 'This is a test note with no frontmatter.',
			parent_id: parentFolder.id,
		});

		const note2 = await Note.loadByTitle('empty frontmatter');
		expect(note2).toMatchObject({
			title: 'empty frontmatter',
			body: 'Test.',
			parent_id: parentFolder.id,
		});

		await verifyDirectoryMatches(tempDir, {
			'testFolder/a note.md': `---\ntitle: a note\nid: ${note.id}\n---\n\nThis is a test note with no frontmatter.`,
			'testFolder/empty frontmatter.md': `---\ntitle: empty frontmatter\nid: ${note2.id}\n---\n\nTest.`,
			'testFolder/.folder.yml': `title: testFolder\nid: ${parentFolder.id}\n`,
		});
	});

	it('should apply changes made to a local dir to notes', async () => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, {
			'test/test_note.md': '---\ntitle: test_note\n---',
			'test/a.md': '---\ntitle: A test\n---',
			'test/b.md': '---\ntitle: Another test\n---\nFoo',
		});

		const service = new FileMirroringService();
		await service.syncDir(tempDir, [], []);

		await fs.appendFile(join(tempDir, 'test/test_note.md'), 'Testing 123...');
		await fs.appendFile(join(tempDir, 'test/a.md'), 'Testing...');

		await service.syncDir(tempDir, [], []);

		const folder = await Folder.loadByTitle('test');

		const testNote = await Note.loadByTitle('test_note');
		expect(testNote).toMatchObject({
			title: 'test_note',
			body: 'Testing 123...',
			parent_id: folder.id,
		});

		const noteA = await Note.loadByTitle('A test');
		expect(noteA).toMatchObject({
			title: 'A test',
			body: 'Testing...',
			parent_id: folder.id,
		});

		const noteB = await Note.loadByTitle('Another test');
		expect(noteB).toMatchObject({
			title: 'Another test',
			body: 'Foo',
			parent_id: folder.id,
		});
		const expectedDirectoryContent = {
			'test/test_note.md': `---\ntitle: test_note\nid: ${testNote.id}\n---\n\nTesting 123...`,
			'test/a.md': `---\ntitle: A test\nid: ${noteA.id}\n---\n\nTesting...`,
			'test/b.md': `---\ntitle: Another test\nid: ${noteB.id}\n---\n\nFoo`,
			'test/.folder.yml': `title: test\nid: ${folder.id}\n`,
		};
		await verifyDirectoryMatches(tempDir, expectedDirectoryContent);

		// Should not change directory unnecessarily
		await service.syncDir(tempDir, [], []);
		await verifyDirectoryMatches(tempDir, expectedDirectoryContent);
	});

	it.each([
		[{ 'test/foo.md': 'This is a test' }, 1],
		[{ 'test/foo.md': '---\ntitle: Foo---\n\n', 'test/bar.md': '---\ntitle: bar\n---\n\n' }, 2],
	])('should delete notes in dir when deleted in DB (case %#)', async (testData, expectedNoteCount) => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, testData);

		const service = new FileMirroringService();
		await service.syncDir(tempDir, [], []);

		const noteIds = await Note.allIds();
		expect(noteIds).toHaveLength(expectedNoteCount);

		for (const id of noteIds) {
			await Note.delete(id);
			await service.syncDir(tempDir, [], []);

			const dirStats = await shim.fsDriver().readDirStats(tempDir, { recursive: true });
			const markdownFiles = dirStats.map(stat => stat.path).filter(path => extname(path) === '.md');

			expect(markdownFiles.length).toBe(expectedNoteCount);
			expectedNoteCount --;
		}
	});

	// it('should delete notes locally when deleted remotely', async () => {
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
