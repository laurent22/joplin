import Note from '../../models/Note';
import Folder from '../../models/Folder';
import { remove, readFile } from 'fs-extra';
import { createTempDir, setupDatabaseAndSynchronizer, supportDir, switchClient } from '../../testing/test-utils';
import { NoteEntity } from '../database/types';
import { MarkupToHtml } from '@joplin/renderer';
import BaseModel from '../../BaseModel';
import InteropService from './InteropService';
import InteropService_Importer_OneNote from './InteropService_Importer_OneNote';
import { JSDOM } from 'jsdom';
import { ImportModuleOutputFormat } from './types';

describe('InteropService_Importer_OneNote', () => {
	let tempDir: string;
	async function importNote(path: string) {
		const newFolder = await Folder.save({ title: 'folder' });
		const service = InteropService.instance();
		await service.import({
			outputFormat: ImportModuleOutputFormat.Markdown,
			path,
			destinationFolder: newFolder,
			destinationFolderId: newFolder.id,
		});
		const allNotes: NoteEntity[] = await Note.all();
		return allNotes;
	}
	beforeAll(() => {
		const jsdom = new JSDOM('<div></div>');
		InteropService.instance().document = jsdom.window.document;
		InteropService.instance().xmlSerializer = new jsdom.window.XMLSerializer();
	});
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		tempDir = await createTempDir();
	});
	afterEach(async () => {
		await remove(tempDir);
	});
	it('should import a simple OneNote notebook', async () => {
		const notes = await importNote(`${supportDir}/onenote/simple_notebook.zip`);
		const folders = await Folder.all();

		expect(notes.length).toBe(2);
		const mainNote = notes[0];

		expect(folders.length).toBe(3);
		const parentFolder = folders.find(f => f.id === mainNote.parent_id);
		expect(parentFolder.title).toBe('Section title');
		expect(folders.find(f => f.id === parentFolder.parent_id).title).toBe('Simple notebook');

		expect(mainNote.title).toBe('Page title');
		expect(mainNote.markup_language).toBe(MarkupToHtml.MARKUP_LANGUAGE_HTML);
		expect(mainNote.body).toMatchSnapshot(mainNote.title);
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
		const subSection1 = folders.find(f => f.title === 'Subsection 1');
		const subSection2 = folders.find(f => f.title === 'Subsection 2');
		const notesFromParentSection = notes.filter(n => n.parent_id === parentSection.id);

		expect(parentSection.id).toBe(subSection1.parent_id);
		expect(parentSection.id).toBe(subSection2.parent_id);
		expect(parentSection.id).toBe(subSection.parent_id);
		expect(folders.length).toBe(7);
		expect(notes.length).toBe(6);
		expect(notesFromParentSection.length).toBe(2);
	});

	it('should expect notes to be rendered the same', async () => {
		let idx = 0;
		const originalIdGenerator = BaseModel.setIdGenerator(() => String(idx++));
		const notes = await importNote(`${supportDir}/onenote/complex_notes.zip`);

		const folders = await Folder.all();
		const parentSection = folders.find(f => f.title === 'Quick Notes');
		expect(folders.length).toBe(3);
		expect(notes.length).toBe(7);
		expect(notes.filter(n => n.parent_id === parentSection.id).length).toBe(6);

		for (const note of notes) {
			expect(note.body).toMatchSnapshot(note.title);
		}
		BaseModel.setIdGenerator(originalIdGenerator);
	});

	it('should render the proper tree for notebook with group sections', async () => {
		const notes = await importNote(`${supportDir}/onenote/group_sections.zip`);
		const folders = await Folder.all();

		const mainFolder = folders.find(f => f.title === 'Notebook created on OneNote App');
		const section = folders.find(f => f.title === 'Section');
		const sectionA1 = folders.find(f => f.title === 'Section A1');
		const sectionA = folders.find(f => f.title === 'Section A');
		const sectionB1 = folders.find(f => f.title === 'Section B1');
		const sectionB = folders.find(f => f.title === 'Section B');
		const sectionD1 = folders.find(f => f.title === 'Section D1');
		const sectionD = folders.find(f => f.title === 'Section D');

		expect(section.parent_id).toBe(mainFolder.id);
		expect(sectionA.parent_id).toBe(mainFolder.id);
		expect(sectionD.parent_id).toBe(mainFolder.id);

		expect(sectionA1.parent_id).toBe(sectionA.id);
		expect(sectionB.parent_id).toBe(sectionA.id);

		expect(sectionB1.parent_id).toBe(sectionB.id);
		expect(sectionD1.parent_id).toBe(sectionD.id);

		expect(notes.filter(n => n.parent_id === sectionA1.id).length).toBe(2);
		expect(notes.filter(n => n.parent_id === sectionB1.id).length).toBe(2);
		expect(notes.filter(n => n.parent_id === sectionD1.id).length).toBe(1);
	});

	it.each([
		'svg_with_text_and_style.html',
		'many_svgs.html',
	])('should extract svgs', async (filename: string) => {
		const titleGenerator = () => {
			let id = 0;
			return () => {
				id += 1;
				return `id${id}`;
			};
		};
		const filepath = `${supportDir}/onenote/${filename}`;
		const content = await readFile(filepath, 'utf-8');

		const jsdom = new JSDOM('<div></div>');
		InteropService.instance().document = jsdom.window.document;
		InteropService.instance().xmlSerializer = new jsdom.window.XMLSerializer();

		const importer = new InteropService_Importer_OneNote();
		await importer.init('asdf', {
			document: jsdom.window.document,
			xmlSerializer: new jsdom.window.XMLSerializer(),
		});

		expect(importer.extractSvgs(content, titleGenerator())).toMatchSnapshot();
	});

	it('should ignore broken characters at the start of paragraph', async () => {
		let idx = 0;
		const originalIdGenerator = BaseModel.setIdGenerator(() => String(idx++));
		const notes = await importNote(`${supportDir}/onenote/bug_broken_character.zip`);

		expect(notes.find(n => n.title === 'Action research - Wikipedia').body).toMatchSnapshot();

		BaseModel.setIdGenerator(originalIdGenerator);
	});
});
