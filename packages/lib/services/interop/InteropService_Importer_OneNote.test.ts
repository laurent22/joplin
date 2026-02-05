import Note from '../../models/Note';
import Folder from '../../models/Folder';
import { remove, readFile } from 'fs-extra';
import { createTempDir, setupDatabaseAndSynchronizer, supportDir, switchClient, withWarningSilenced } from '../../testing/test-utils';
import { NoteEntity } from '../database/types';
import { MarkupToHtml } from '@joplin/renderer';
import BaseModel from '../../BaseModel';
import InteropService from './InteropService';
import InteropService_Importer_OneNote from './InteropService_Importer_OneNote';
import { JSDOM } from 'jsdom';
import { ImportModuleOutputFormat } from './types';
import HtmlToMd from '../../HtmlToMd';

const instructionMessage = `
--------------------------------------
IF THIS IS FAILING IN THE CI
you can test it locally
Check packages/onenote-converter/README.md for more instructions
--------------------------------------
`;

const expectWithInstructions = <T>(value: T) => {
	return expect(value, instructionMessage);
};

const removeItemIds = (body: string) => {
	return body.replace(/:\/[a-z0-9]{32}/g, ':/id-here');
};

const removeDefaultCss = (body: string) => {
	const defaultCssStart = body.indexOf('/*** Start default CSS ***/');
	const endMarker = '/*** End default CSS ***/';
	const defaultCssEnd = body.indexOf(endMarker);
	if (defaultCssEnd === -1 || defaultCssStart === -1) return body;

	const before = body.substring(0, defaultCssStart);
	const after = body.substring(defaultCssEnd + endMarker.length);
	return [before, '/* (For testing: Removed default CSS) */', after].join('\n');
};

const normalizeNoteForSnapshot = (body: string) => {
	return removeItemIds(removeDefaultCss(body));
};

// A single Markdown string is much easier to visually compare during snapshot testing.
// Prefer notesToMarkdownString to normalizeNoteForSnapshot when the exact output HTML
// doesn't matter.
const notesToMarkdownString = (notes: NoteEntity[]) => {
	const converter = new HtmlToMd();
	return notes.map(note => {
		return [
			`# Note: ${note.title}`,
			converter.parse(normalizeNoteForSnapshot(note.body)),
		].join('\n\n');
	}).sort().join('\n\n\n');
};

// This file is ignored if not running in CI. Look at onenote-converter/README.md and jest.config.js for more information
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
		InteropService.instance().domParser = new jsdom.window.DOMParser();
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

		expectWithInstructions(notes.length).toBe(2);
		const mainNote = notes[0];

		expectWithInstructions(folders.length).toBe(3);
		const parentFolder = folders.find(f => f.id === mainNote.parent_id);
		expectWithInstructions(parentFolder.title).toBe('Section title');
		expectWithInstructions(folders.find(f => f.id === parentFolder.parent_id).title).toBe('Simple notebook');

		expectWithInstructions(mainNote.title).toBe('Page title');
		expectWithInstructions(mainNote.markup_language).toBe(MarkupToHtml.MARKUP_LANGUAGE_HTML);
		expectWithInstructions(normalizeNoteForSnapshot(mainNote.body)).toMatchSnapshot(mainNote.title);
	});

	it('should preserve indentation of subpages in Section page', async () => {
		const notes = await importNote(`${supportDir}/onenote/subpages.zip`);

		const sectionPage = notes.find(n => n.title === 'Section');
		const menuHtml = sectionPage.body.split('<ul>')[1].split('</ul>')[0];
		const menuLines = menuHtml.split('</li>');

		const pageTwo = notes.find(n => n.title === 'Page 2');
		expectWithInstructions(menuLines[3].trim()).toBe(`<li class="l1"><a href=":/${pageTwo.id}" target="content" title="Page 2">${pageTwo.title}</a>`);

		const pageTwoA = notes.find(n => n.title === 'Page 2-a');
		expectWithInstructions(menuLines[4].trim()).toBe(`<li class="l2"><a href=":/${pageTwoA.id}" target="content" title="Page 2-a">${pageTwoA.title}</a>`);

		const pageTwoAA = notes.find(n => n.title === 'Page 2-a-a');
		expectWithInstructions(menuLines[5].trim()).toBe(`<li class="l3"><a href=":/${pageTwoAA.id}" target="content" title="Page 2-a-a">${pageTwoAA.title}</a>`);

		const pageTwoB = notes.find(n => n.title === 'Page 2-b');
		expectWithInstructions(menuLines[7].trim()).toBe(`<li class="l2"><a href=":/${pageTwoB.id}" target="content" title="Page 2-b">${pageTwoB.title}</a>`);
	});

	it('should created subsections', async () => {
		const notes = await importNote(`${supportDir}/onenote/subsections.zip`);
		const folders = await Folder.all();

		const parentSection = folders.find(f => f.title === 'Group Section 1');
		const subSection = folders.find(f => f.title === 'Group Section 1-a');
		const subSection1 = folders.find(f => f.title === 'Subsection 1');
		const subSection2 = folders.find(f => f.title === 'Subsection 2');
		const notesFromParentSection = notes.filter(n => n.parent_id === parentSection.id);

		expectWithInstructions(parentSection.id).toBe(subSection1.parent_id);
		expectWithInstructions(parentSection.id).toBe(subSection2.parent_id);
		expectWithInstructions(parentSection.id).toBe(subSection.parent_id);
		expectWithInstructions(folders.length).toBe(7);
		expectWithInstructions(notes.length).toBe(6);
		expectWithInstructions(notesFromParentSection.length).toBe(2);
	});

	it('should expect notes to be rendered the same', async () => {
		let idx = 0;
		const originalIdGenerator = BaseModel.setIdGenerator(() => String(idx++));
		const notes = await importNote(`${supportDir}/onenote/complex_notes.zip`);

		const folders = await Folder.all();
		const parentSection = folders.find(f => f.title === 'Quick Notes');
		expectWithInstructions(folders.length).toBe(3);
		expectWithInstructions(notes.length).toBe(7);
		expectWithInstructions(notes.filter(n => n.parent_id === parentSection.id).length).toBe(6);

		for (const note of notes) {
			expectWithInstructions(normalizeNoteForSnapshot(note.body)).toMatchSnapshot(note.title);
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

		expectWithInstructions(section.parent_id).toBe(mainFolder.id);
		expectWithInstructions(sectionA.parent_id).toBe(mainFolder.id);
		expectWithInstructions(sectionD.parent_id).toBe(mainFolder.id);

		expectWithInstructions(sectionA1.parent_id).toBe(sectionA.id);
		expectWithInstructions(sectionB.parent_id).toBe(sectionA.id);

		expectWithInstructions(sectionB1.parent_id).toBe(sectionB.id);
		expectWithInstructions(sectionD1.parent_id).toBe(sectionD.id);

		expectWithInstructions(notes.filter(n => n.parent_id === sectionA1.id).length).toBe(2);
		expectWithInstructions(notes.filter(n => n.parent_id === sectionB1.id).length).toBe(2);
		expectWithInstructions(notes.filter(n => n.parent_id === sectionD1.id).length).toBe(1);
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
		const domParser = new jsdom.window.DOMParser();
		const xmlSerializer = new jsdom.window.XMLSerializer();

		const importer = new InteropService_Importer_OneNote();
		await importer.init('asdf', {
			domParser,
			xmlSerializer,
		});

		const dom = domParser.parseFromString(content, 'text/html');
		const extracted = importer.extractSvgs(dom, titleGenerator());
		expect(extracted).toMatchObject({ changed: true });
		expectWithInstructions(
			{ html: dom.body.outerHTML, svgs: extracted.svgs },
		).toMatchSnapshot();
	});

	it('should ignore broken characters at the start of paragraph', async () => {
		let idx = 0;
		const originalIdGenerator = BaseModel.setIdGenerator(() => String(idx++));
		const notes = await importNote(`${supportDir}/onenote/bug_broken_character.zip`);

		expectWithInstructions(
			normalizeNoteForSnapshot(notes.find(n => n.title === 'Action research - Wikipedia').body),
		).toMatchSnapshot();

		BaseModel.setIdGenerator(originalIdGenerator);
	});

	it('should remove hyperlink from title', async () => {
		let idx = 0;
		const originalIdGenerator = BaseModel.setIdGenerator(() => String(idx++));
		const notes = await importNote(`${supportDir}/onenote/remove_hyperlink_on_title.zip`);

		for (const note of notes) {
			expectWithInstructions(normalizeNoteForSnapshot(note.body)).toMatchSnapshot(note.title);
		}
		BaseModel.setIdGenerator(originalIdGenerator);
	});

	it('should group link parts even if they have different css styles', async () => {
		const notes = await importNote(`${supportDir}/onenote/remove_hyperlink_on_title.zip`);

		const noteToTest = notes.find(n => n.title === 'Tips from a Pro Using Trees for Dramatic Landscape Photography');

		expectWithInstructions(noteToTest).toBeTruthy();
		expectWithInstructions(noteToTest.body).toContain('<a href="onenote:https://d.docs.live.net/c8d3bbab7f1acf3a/Documents/Photography/%E9%A3%8E%E6%99%AF.one#Tips%20from%20a%20Pro%20Using%20Trees%20for%20Dramatic%20Landscape%20Photography&amp;section-id={262ADDFB-A4DC-4453-A239-0024D6769962}&amp;page-id={88D803A5-4F43-48D4-9B16-4C024F5787DC}&amp;end" style="">Tips from a Pro: Using Trees for Dramatic Landscape Photography</a>');
	});

	it('should render links properly by ignoring wrongly set indices when the first character is a hyperlink marker', async () => {
		let idx = 0;
		const originalIdGenerator = BaseModel.setIdGenerator(() => String(idx++));
		const notes = await importNote(`${supportDir}/onenote/hyperlink_marker_as_first_character.zip`);

		for (const note of notes) {
			expectWithInstructions(normalizeNoteForSnapshot(note.body)).toMatchSnapshot(note.title);
		}
		BaseModel.setIdGenerator(originalIdGenerator);
	});

	it('should be able to create notes from corrupted attachment', async () => {
		let idx = 0;
		const originalIdGenerator = BaseModel.setIdGenerator(() => String(idx++));
		const notes = await withWarningSilenced(/OneNoteConverter:/, async () => importNote(`${supportDir}/onenote/corrupted_attachment.zip`));

		expectWithInstructions(notes.length).toBe(2);

		for (const note of notes) {
			expectWithInstructions(normalizeNoteForSnapshot(note.body)).toMatchSnapshot(note.title);
		}
		BaseModel.setIdGenerator(originalIdGenerator);
	});

	it('should render audio as links to resource', async () => {
		let idx = 0;
		const originalIdGenerator = BaseModel.setIdGenerator(() => String(idx++));
		const notes = await importNote(`${supportDir}/onenote/note_with_audio_embedded.zip`);

		expectWithInstructions(notes.length).toBe(2);

		for (const note of notes) {
			expectWithInstructions(normalizeNoteForSnapshot(note.body)).toMatchSnapshot(note.title);
		}
		BaseModel.setIdGenerator(originalIdGenerator);
	});

	it('should use default value for EntityGuid and InkBias if not found', async () => {
		const notes = await withWarningSilenced(/OneNoteConverter:/, async () => importNote(`${supportDir}/onenote/ink_bias_and_entity_guid.zip`));

		// InkBias bug
		const note1Content = notes.find(n => n.title === 'Marketing Funnel & Training').body;
		expect(normalizeNoteForSnapshot(note1Content)).toMatchSnapshot();

		// EntityGuid
		const note2Content = notes.find(n => n.title === 'Decrease support costs').body;
		expect(normalizeNoteForSnapshot(note2Content)).toMatchSnapshot();
	});

	it('should support directly importing .one files', async () => {
		const notes = await importNote(`${supportDir}/onenote/onenote_desktop.one`);

		// For this test, just check that the extracted files exist.
		expect(notes.map(note => note.title).sort()).toEqual([
			// The three pages contained within the notebook
			'Another page',
			'Page 3',
			'Test',
			// The index page
			'onenote_desktop',
		]);
	});

	it('should support importing .one files that contain checkboxes', async () => {
		const notes = await importNote(`${supportDir}/onenote/checkboxes_and_unicode.one`);
		expectWithInstructions(
			normalizeNoteForSnapshot(notes.find(n => n.title.startsWith('Test Todo')).body),
		).toMatchSnapshot();
	});

	it('should correctly convert imported notes to Markdown', async () => {
		const notes = await importNote(`${supportDir}/onenote/checkboxes_and_unicode.one`);
		const checklistNote = notes.find(n => n.title.startsWith('Test Todo'));
		const converter = new HtmlToMd();
		const markdown = converter.parse(checklistNote.body);

		expect(markdown).toMatchSnapshot('Test Todo: As Markdown');
	});

	it('should correctly import math formulas', async () => {
		const notes = await importNote(`${supportDir}/onenote/Math.one`);
		const importedNote = notes.find(n => n.title.startsWith('Math'));

		const converter = new HtmlToMd();
		const markdown = converter.parse(importedNote.body);

		expect(markdown).toMatchSnapshot('Math');
	});

	it('should apply position data for embedded files', async () => {
		const notes = await importNote(`${supportDir}/onenote/testOneNoteEmbeddedWordDoc.one`);
		const importedNote = notes.find(n => n.title.startsWith('Embedded doc sheet'));

		expect(normalizeNoteForSnapshot(importedNote.body)).toMatchSnapshot('EmbeddedFiles');
	});

	it('should correctly import .onepkg notebooks', async () => {
		const notes = await importNote(`${supportDir}/onenote/test.onepkg`);

		expect(notesToMarkdownString(notes)).toMatchSnapshot();
	});
});
