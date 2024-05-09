import Note from '../../models/Note';
import Folder from '../../models/Folder';
import * as fs from 'fs-extra';
import { createTempDir, setupDatabaseAndSynchronizer, supportDir, switchClient } from '../../testing/test-utils';
import { NoteEntity } from '../database/types';
import InteropService_Importer_OneNote from './InteropService_Importer_OneNote';
import { MarkupToHtml } from '@joplin/renderer';
import BaseModel from '../../BaseModel';
import uuid from '../../uuid';

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

	it('should preserve indentation of subpages in Section page', async () => {
		const notes = await importNote(`${supportDir}/onenote/subpages.zip`);

		const sectionPage = notes.find(n => n.title === 'Section');
		const menuHtml = sectionPage.body.split('<ul>')[1].split('</ul>')[0];
		const menuLines = menuHtml.split('</li>');

		const pageTwo = notes.find(n => n.title === 'Page 2');
		expect(menuLines[3].trim()).toBe(`<li class="l1"><a href=":/${pageTwo.id}" target="content" title="Page 2">${pageTwo.title}</a>`);

		const pageTwoA = notes.find(n => n.title === 'Page 2-a');
		expect(menuLines[4].trim()).toBe(`<li class="l2"><a href=":/${pageTwoA.id}" target="content" title="Page 2-a">${pageTwoA.title}</a>`);

		const pageTwoAA = notes.find(n => n.title === 'Page 2-a-a');
		expect(menuLines[5].trim()).toBe(`<li class="l3"><a href=":/${pageTwoAA.id}" target="content" title="Page 2-a-a">${pageTwoAA.title}</a>`);

		const pageTwoB = notes.find(n => n.title === 'Page 2-b');
		expect(menuLines[7].trim()).toBe(`<li class="l2"><a href=":/${pageTwoB.id}" target="content" title="Page 2-b">${pageTwoB.title}</a>`);
	});

	it('should created subsections', async () => {
		const notes = await importNote(`${supportDir}/onenote/subsections.zip`);
		const folders = await Folder.all();

		const parentSection = folders.find(f => f.title === 'Group Section 1');
		const subSection = folders.find(f => f.title === 'Group Section 1-a');
		const notesFromParentSection = notes.filter(n => n.parent_id === parentSection.id);

		expect(parentSection.id).toBe(subSection.parent_id);
		expect(folders.length).toBe(6);
		expect(notes.length).toBe(9);
		expect(notesFromParentSection.length).toBe(3);
	});

	it('should expect notes to be rendered the same', async () => {
		let idx = 0;
		BaseModel.setIdGenerator(() => String(idx++));
		const notes = await importNote(`${supportDir}/onenote/complex_notes.zip`);

		for (const note of notes) {
			expect(note.body).toMatchSnapshot(note.title);
		}
		BaseModel.setIdGenerator(uuid.create);
	});
});
