import { writeFile, remove } from 'fs-extra';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import { createTempDir, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import { FolderEntity, NoteEntity } from '../database/types';
import InteropService from './InteropService';
import { ImportOptions } from './types';

const extractId = (rawContent: string): string => {
	const lines = rawContent.split('\n');
	for (const line of lines) {
		if (line.startsWith('id: ')) return line.substr(4);
	}
	throw new Error(`Could not extract ID from: ${rawContent}`);
};

const makeFilePath = (baseDir: string, itemContent: string): string => {
	return `${baseDir}/${extractId(itemContent)}.md`;
};

const rawFolder1 = `import test

id: 15fa3f4abe89429b8836cdc5859fe74b
created_time: 2022-08-29T14:42:47.684Z
updated_time: 2022-08-29T14:42:47.684Z
user_created_time: 2022-08-29T14:42:47.684Z
user_updated_time: 2022-08-29T14:42:47.684Z
encryption_cipher_text: 
encryption_applied: 0
parent_id: 
is_shared: 0
share_id: 
master_key_id: 
icon: 
type_: 2`;

const rawFolder2 = `sub-notebook

id: 6c114fa9cc4d421db908a6293418c1b2
created_time: 2022-08-29T14:42:56.113Z
updated_time: 2022-08-29T14:43:02.774Z
user_created_time: 2022-08-29T14:42:56.113Z
user_updated_time: 2022-08-29T14:43:02.774Z
encryption_cipher_text: 
encryption_applied: 0
parent_id: 15fa3f4abe89429b8836cdc5859fe74b
is_shared: 0
share_id: 
master_key_id: 
icon: 
type_: 2`;

const rawNote1 = `Note 1

id: 7e5e0c7202414cd38e2db12e2e92ac91
parent_id: 15fa3f4abe89429b8836cdc5859fe74b
created_time: 2022-08-29T14:43:06.961Z
updated_time: 2022-08-29T14:43:10.596Z
is_conflict: 0
latitude: 53.80075540
longitude: -1.54907740
altitude: 0.0000
author: 
source_url: 
is_todo: 0
todo_due: 0
todo_completed: 0
source: joplindev-desktop
source_application: net.cozic.joplindev-desktop
application_data: 
order: 0
user_created_time: 2022-08-29T14:43:06.961Z
user_updated_time: 2022-08-29T14:43:10.596Z
encryption_cipher_text: 
encryption_applied: 0
markup_language: 1
is_shared: 0
share_id: 
conflict_original_id: 
master_key_id: 
type_: 1`;

const rawNote2 = `Note 2

id: 49faf4793cc048b698a592f9a76567af
parent_id: 6c114fa9cc4d421db908a6293418c1b2
created_time: 2022-08-29T14:43:13.117Z
updated_time: 2022-08-29T14:43:15.023Z
is_conflict: 0
latitude: 53.80075540
longitude: -1.54907740
altitude: 0.0000
author: 
source_url: 
is_todo: 0
todo_due: 0
todo_completed: 0
source: joplindev-desktop
source_application: net.cozic.joplindev-desktop
application_data: 
order: 0
user_created_time: 2022-08-29T14:43:13.117Z
user_updated_time: 2022-08-29T14:43:15.023Z
encryption_cipher_text: 
encryption_applied: 0
markup_language: 1
is_shared: 0
share_id: 
conflict_original_id: 
master_key_id: 
type_: 1`;

let tempDir: string;

const createFiles = async () => {
	await writeFile(makeFilePath(tempDir, rawFolder1), rawFolder1);
	await writeFile(makeFilePath(tempDir, rawFolder2), rawFolder2);
	await writeFile(makeFilePath(tempDir, rawNote1), rawNote1);
	await writeFile(makeFilePath(tempDir, rawNote2), rawNote2);
};

describe('InteropService_Importer_Raw', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		tempDir = await createTempDir();
	});

	afterEach(async () => {
		await remove(tempDir);
	});

	it('should import raw files', async () => {
		await createFiles();

		const importOptions: ImportOptions = {
			path: tempDir,
			format: 'raw',
			destinationFolderId: '',
		};

		await InteropService.instance().import(importOptions);

		const folder1: FolderEntity = await Folder.loadByTitle('import test');
		const folder2: FolderEntity = await Folder.loadByTitle('sub-notebook');
		const note1: NoteEntity = await Note.loadByTitle('Note 1');
		const note2: NoteEntity = await Note.loadByTitle('Note 2');

		expect(folder1).toBeTruthy();
		expect(folder2).toBeTruthy();
		expect(note1).toBeTruthy();
		expect(note2).toBeTruthy();

		expect(folder1.id).not.toBe(extractId(rawFolder1));
		expect(folder2.id).not.toBe(extractId(rawFolder2));
		expect(note1.id).not.toBe(extractId(rawNote1));
		expect(note2.id).not.toBe(extractId(rawNote2));

		expect(folder1.parent_id).toBe('');
		expect(folder2.parent_id).toBe(folder1.id);
		expect(note1.parent_id).toBe(folder1.id);
		expect(note2.parent_id).toBe(folder2.id);
	});

	it('should handle duplicate names', async () => {
		await createFiles();

		const importOptions: ImportOptions = {
			path: tempDir,
			format: 'raw',
			destinationFolderId: '',
		};

		// Import twice to create duplicate items
		await InteropService.instance().import(importOptions);
		await InteropService.instance().import(importOptions);

		const tree: any = await Folder.allAsTree(null, { includeNotes: true });

		expect(tree[0].title).toBe('import test');
		expect(tree[0].notes[0].title).toBe('Note 1');
		expect(tree[0].children[0].title).toBe('sub-notebook');
		expect(tree[0].children[0].notes[0].title).toBe('Note 2');

		// The first notebook should have a (1) because it's at the same level
		// as the other "import test" notebook. Its content however should not
		// have any (x) because they are at different levels.
		expect(tree[1].title).toBe('import test (1)');
		expect(tree[1].notes[0].title).toBe('Note 1');
		expect(tree[1].children[0].title).toBe('sub-notebook');
		expect(tree[1].children[0].notes[0].title).toBe('Note 2');
	});

});
