import Folder from '../../models/Folder';
import Note from '../../models/Note';
import { createFolderTree, createTempDir, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import FolderMirror from './FolderMirror';
import { extname, join } from 'path';
import createFilesFromPathRecord from '../../utils/pathRecord/createFilesFromPathRecord';
import verifyDirectoryMatches from '../../utils/pathRecord/verifyDirectoryMatches';
import * as fs from 'fs-extra';
import shim from '../../shim';
const { ALL_NOTES_FILTER_ID } = require('../../reserved-ids.js');

describe('FolderMirror.fullSync', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);

		// Required for AsyncActionQueue
		jest.useRealTimers();
	});

	it('should create notes in a local dir', async ()=> {
		const baseFolder = await Folder.save({ title: 'Base folder' });
		const folder1 = await Folder.save({ title: 'folder1', parent_id: baseFolder.id });
		const folder2 = await Folder.save({ title: 'folder2', parent_id: baseFolder.id });
		const folder3 = await Folder.save({ title: 'folder3', parent_id: folder2.id });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id, body: 'Test' });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id, body: '# Heading' });
		const note3 = await Note.save({ title: 'note3', parent_id: folder3.id, is_todo: 1 });
		const note3Copy = await Note.save({ title: 'note3', parent_id: folder3.id });

		const tempDir = await createTempDir();
		const mirror = new FolderMirror(tempDir, baseFolder.id);

		await mirror.fullSync();

		await verifyDirectoryMatches(tempDir, {
			[join(folder1.title, `${note1.title}.md`)]: [
				'---',
				'title: note1',
				`id: ${note1.id}`,
				'---',
				'',
				'Test',
			].join('\n'),
			[join(folder1.title, `${note2.title}.md`)]: [
				'---',
				'title: note2',
				`id: ${note2.id}`,
				'---',
				'',
				'# Heading',
			].join('\n'),
			[join(folder1.title, '.folder.yml')]: [
				`title: ${folder1.title}`,
				`id: ${folder1.id}`,
				'',
			].join('\n'),
			[join(folder2.title, folder3.title, `${note3.title}.md`)]: [
				'---',
				'title: note3',
				`id: ${note3.id}`,
				'completed?: no',
				'---',
				'',
				'',
			].join('\n'),
			[join(folder2.title, folder3.title, `${note3Copy.title} (1).md`)]: [
				'---',
				'title: note3',
				`id: ${note3Copy.id}`,
				'---',
				'',
				'',
			].join('\n'),
			[join(folder2.title, '.folder.yml')]: [
				`title: ${folder2.title}`,
				`id: ${folder2.id}`,
				'',
			].join('\n'),
			[join(folder2.title, folder3.title, '.folder.yml')]: [
				`title: ${folder3.title}`,
				`id: ${folder3.id}`,
				'',
			].join('\n'),
		});
	});

	it('should import notes from a local dir', async () => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, {
			'test/a.md': '---\ntitle: A test\n---',
			'test/b.md': '---\ntitle: Another test\n---\nFoo',
			'test/foo/b.md': '---\ntitle: Another test (subfolder)\n---',
		});

		const baseFolder = await Folder.save({ title: 'base' });
		const mirror = new FolderMirror(tempDir, baseFolder.id);
		await mirror.fullSync();

		const innerFolder = await Folder.loadByTitle('test');

		expect(innerFolder).toMatchObject({ title: 'test' });
		const noteA = await Note.loadByTitle('A test');
		expect(noteA).toMatchObject({
			is_todo: 0,
			title: 'A test',
			parent_id: innerFolder.id,
			body: '',
		});
		const noteB = await Note.loadByTitle('Another test');
		expect(noteB).toMatchObject({
			is_todo: 0,
			title: 'Another test',
			parent_id: innerFolder.id,
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
			'test/.folder.yml': `title: ${innerFolder.title}\nid: ${innerFolder.id}\n`,
			'test/foo/.folder.yml': `title: ${subFolder.title}\nid: ${subFolder.id}\n`,
		});
	});

	it('should handle the case where a note has no or empty frontmatter', async () => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, {
			'testFolder/a note.md': 'This is a test note with no frontmatter.',
			'testFolder/empty frontmatter.md': '---\n---\nTest.',
		});

		const mirror = new FolderMirror(tempDir, ALL_NOTES_FILTER_ID);
		await mirror.fullSync();

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

		const mirror = new FolderMirror(tempDir, ALL_NOTES_FILTER_ID);
		await mirror.fullSync();

		await fs.appendFile(join(tempDir, 'test/test_note.md'), 'Testing 123...');
		await fs.appendFile(join(tempDir, 'test/a.md'), 'Testing...');

		await mirror.fullSync();

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
		await mirror.fullSync();
		await verifyDirectoryMatches(tempDir, expectedDirectoryContent);
	});

	it.each([
		[{ 'test/foo.md': 'This is a test' }, 1],
		[{ 'test/foo.md': '---\ntitle: Foo---\n\n', 'test/bar.md': '---\ntitle: bar\n---\n\n' }, 2],
	])('should delete notes in dir when deleted in DB (case %#)', async (testData, expectedNoteCount) => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, testData);

		const baseFolderId = (await Folder.save({ title: 'base folder' })).id;
		const mirror = new FolderMirror(tempDir, baseFolderId);
		await mirror.fullSync();

		const noteIds = await Note.allIds();
		expect(noteIds).toHaveLength(expectedNoteCount);

		for (const id of noteIds) {
			await Note.delete(id, { toTrash: true });
			expectedNoteCount --;
			await mirror.fullSync();

			const dirStats = await shim.fsDriver().readDirStats(tempDir, { recursive: true });
			const markdownFiles = dirStats.map(stat => stat.path).filter(path => extname(path) === '.md');

			expect(markdownFiles.length).toBe(expectedNoteCount);
		}
	});

	it('should move notes in dir when moved in DB', async () => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, {
			'a note.md': 'Note 1',
			'another note.md': 'Note 2',
			'newFolder/test.md': 'Note 3',
		});

		const mirror = new FolderMirror(tempDir, ALL_NOTES_FILTER_ID);
		await mirror.fullSync();

		const note1 = await Note.loadByTitle('a note');
		expect(note1.body).toBe('Note 1');
		const note2 = await Note.loadByTitle('another note');
		expect(note2.body).toBe('Note 2');
		const note3 = await Note.loadByTitle('test');
		expect(note3.body).toBe('Note 3');

		const targetFolder = await Folder.loadByTitle('newFolder');
		await Note.moveToFolder(note1.id, targetFolder.id);

		await mirror.fullSync();

		await verifyDirectoryMatches(tempDir, {
			'another note.md': `---\ntitle: another note\nid: ${note2.id}\n---\n\nNote 2`,
			'newFolder/test.md': `---\ntitle: test\nid: ${note3.id}\n---\n\nNote 3`,
			'newFolder/a note.md': `---\ntitle: a note\nid: ${note1.id}\n---\n\nNote 1`,
			'newFolder/.folder.yml': `title: newFolder\nid: ${targetFolder.id}\n`,
		});
	});

	it('should remove notes from dir when moved out of synced folder in DB', async () => {
		const syncFolder = await createFolderTree('', [
			{
				title: 'folder 1',
				children: [
					{
						title: 'note 1',
						body: 'Note 1',
					},
					{
						title: 'note 2',
					},
				],
			},
		]);

		const unsyncedFolderId = (await Folder.save({ title: 'Unsynced' })).id;
		const note1Id = (await Note.loadByTitle('note 1')).id;
		const note2Id = (await Note.loadByTitle('note 2')).id;

		const tempDir = await createTempDir();
		const mirror = new FolderMirror(tempDir, syncFolder.id);
		await mirror.fullSync();

		await verifyDirectoryMatches(tempDir, {
			'note 1.md': `---\ntitle: note 1\nid: ${note1Id}\n---\n\nNote 1`,
			'note 2.md': `---\ntitle: note 2\nid: ${note2Id}\n---\n\n`,
		});

		await Note.moveToFolder(note1Id, unsyncedFolderId);

		await mirror.fullSync();

		await verifyDirectoryMatches(tempDir, {
			'note 2.md': `---\ntitle: note 2\nid: ${note2Id}\n---\n\n`,
		});

		// Note should still exist
		expect(await Note.load(note1Id)).toMatchObject({
			id: note1Id,
			parent_id: unsyncedFolderId,
			body: 'Note 1',
			deleted_time: 0,
		});
	});

	it('should rename folders in DB when renamed in dir', async () => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, {
			'another note.md': 'Note 2',
			'newFolder/test.md': 'Note 3',
		});

		const mirror = new FolderMirror(tempDir, '');
		await mirror.fullSync();

		const newFolderId = (await Folder.loadByTitle('newFolder')).id;

		expect(await fs.readFile(join(tempDir, 'newFolder', '.folder.yml'), 'utf8')).toBe(`title: newFolder\nid: ${newFolderId}\n`);

		await fs.writeFile(join(tempDir, 'newFolder', '.folder.yml'), `title: New title\nid: ${newFolderId}\n`);
		await mirror.fullSync();

		expect(await Folder.load(newFolderId)).toMatchObject({
			id: newFolderId,
			title: 'New title',
			deleted_time: 0, // Should not be deleted
		});
	});

	it('should rename folders in dir when renamed in DB', async () => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, {
			'another note.md': 'Note 2',
			'newFolder/test.md': 'Note 3',
		});

		const mirror = new FolderMirror(tempDir, '');
		await mirror.fullSync();

		const newFolderId = (await Folder.loadByTitle('newFolder')).id;
		await Folder.save({ id: newFolderId, title: 'New Title' });

		await mirror.fullSync();

		expect(await fs.readFile(join(tempDir, 'New Title', '.folder.yml'), 'utf8')).toBe(`title: New Title\nid: ${newFolderId}\n`);

		expect(await Folder.load(newFolderId)).toMatchObject({
			id: newFolderId,
			title: 'New Title',
		});
	});

	it('should add a note to the remote, even if a note at the same path (but different ID) already exists', async () => {
		const tempDir = await createTempDir();
		await createFilesFromPathRecord(tempDir, {
			'note.md': '---\ntitle: note\nid: 1234567890abcdef0123123456789012\n---\n\n',
		});

		await Note.save({ title: 'note', id: '000000000000abcf0123123456789012', parent_id: '' }, { isNew: true });

		const mirror = new FolderMirror(tempDir, '');
		await mirror.fullSync();

		expect(await Note.load('1234567890abcdef0123123456789012')).toMatchObject({ title: 'note', parent_id: '' });
		expect(await Note.load('000000000000abcf0123123456789012')).toMatchObject({ title: 'note', parent_id: '' });

		await verifyDirectoryMatches(tempDir, {
			'note.md': '---\ntitle: note\nid: 1234567890abcdef0123123456789012\n---\n\n',
			'note (1).md': '---\ntitle: note\nid: 000000000000abcf0123123456789012\n---\n\n',
		});
	});

	test('should give notes new IDs when duplicated', async () => {
		const tempDir = await createTempDir();
		const noteId = (await Note.save({ title: 'note', parent_id: '' })).id;

		const mirror = new FolderMirror(tempDir, '');
		await mirror.fullSync();

		await verifyDirectoryMatches(tempDir, {
			'note.md': `---\ntitle: note\nid: ${noteId}\n---\n\n`,
		});

		await fs.writeFile(join(tempDir, 'Same-id note.md'), `---\ntitle: Same-id note\nid: ${noteId}\n---\n\nTest`, 'utf-8');

		await mirror.fullSync();

		const noteCopy = await Note.loadByTitle('Same-id note');
		await verifyDirectoryMatches(tempDir, {
			'Same-id note.md': `---\ntitle: Same-id note\nid: ${noteCopy.id}\n---\n\nTest`,
			'note.md': `---\ntitle: note\nid: ${noteId}\n---\n\n`,
		});
		expect(noteCopy.id).not.toBe(noteId);
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
