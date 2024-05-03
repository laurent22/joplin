import Note from '../../models/Note';
import Folder from '../../models/Folder';
import * as fs from 'fs-extra';
import { createTempDir, setupDatabaseAndSynchronizer, supportDir, switchClient } from '../../testing/test-utils';
import { NoteEntity } from '../database/types';
import InteropService_Importer_OneNote from './InteropService_Importer_OneNote';
import { MarkupToHtml } from '@joplin/renderer';


describe('InteropService_Importer_OneNote', () => {
	let tempDir: string;
	async function importNote(path: string) {
		const newFolder = await Folder.save({ title: 'folder' });
		const importer = new InteropService_Importer_OneNote();
		await importer.init(path, {
			format: 'md',
			outputFormat: 'md',
			path,
			destinationFolder: newFolder,
			destinationFolderId: newFolder.id,
		});
		importer.setMetadata({ fileExtensions: ['md'] });
		await importer.exec({ warnings: [] });
		const allNotes: NoteEntity[] = await Note.all();
		return allNotes;
	}
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		tempDir = await createTempDir();
	});
	afterEach(async () => {
		await fs.remove(tempDir);
	});
	it('should import a simple OneNote notebook', async () => {
		const notes = await importNote(`${supportDir}/onenote/simple_notebook.zip`);

		expect(notes.length).toBe(2);
		// expect(note[1]).toBe('navigation page');
		// expect(note.length).toBe(1);
		const note = notes[0];
		expect(note.title).toBe('Page title');
		// we might be able to be able to populate these with some work
		// expect(note.created_time).toBe('...');
		// expect(note.updated_time).toBe('...');
		expect(note.markup_language).toBe(MarkupToHtml.MARKUP_LANGUAGE_HTML);
		const expectedBody = await fs.readFile(`${supportDir}/onenote/simple_notebook.html`, 'utf-8');
		// note.body doesn't have line feed character, but file input has
		expect(note.body).toEqual(expectedBody.slice(0, expectedBody.length - 1));
	});
});
