import InteropService_Importer_Md from '../../services/interop/InteropService_Importer_Md';
import Note from '../../models/Note';
import Folder from '../../models/Folder';
import * as fs from 'fs-extra';
import { createTempDir, setupDatabaseAndSynchronizer, supportDir, switchClient } from '../../testing/test-utils';
import { MarkupToHtml } from '@joplin/renderer';
import { FolderEntity, NoteEntity, ResourceEntity } from '../database/types';
import Resource from '../../models/Resource';


describe('InteropService_Importer_Md', () => {
	let tempDir: string;
	async function importNote(path: string) {
		const newFolder = await Folder.save({ title: 'folder' });
		const importer = new InteropService_Importer_Md();
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
		return allNotes[0];
	}
	async function importHTMLNote(path: string) {
		const newFolder = await Folder.save({ title: 'folder' });
		const importer = new InteropService_Importer_Md();
		await importer.init(path, {
			format: 'html',
			outputFormat: 'html',
			path,
			destinationFolder: newFolder,
			destinationFolderId: newFolder.id,
		});
		importer.setMetadata({ fileExtensions: ['md'] });
		await importer.exec({ warnings: [] });
		const allNotes: NoteEntity[] = await Note.all();
		return allNotes[0];
	}
	async function importNoteDirectory(path: string) {
		const importer = new InteropService_Importer_Md();
		await importer.init(path, {
			format: 'md',
			outputFormat: 'md',
			path,
		});
		importer.setMetadata({ fileExtensions: ['md', 'html'] });
		return await importer.exec({ warnings: [] });
	}
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		tempDir = await createTempDir();
	});
	afterEach(async () => {
		await fs.remove(tempDir);
	});
	it('should import linked files and modify tags appropriately', async () => {
		const note = await importNote(`${supportDir}/test_notes/md/sample.md`);

		const tagNonExistentFile = '![does not exist](does_not_exist.png)';
		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(2);
		const inexistentLinkUnchanged = note.body.includes(tagNonExistentFile);
		expect(inexistentLinkUnchanged).toBe(true);
	});
	it('should only create 1 resource for duplicate links, all tags should be updated', async () => {
		const note = await importNote(`${supportDir}/test_notes/md/sample-duplicate-links.md`);

		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(1);
		const reg = new RegExp(items[0].id, 'g');
		const matched = note.body.match(reg);
		expect(matched.length).toBe(2);
	});
	it('should import linked files and modify tags appropriately when link is also in alt text', async () => {
		const note = await importNote(`${supportDir}/test_notes/md/sample-link-in-alt-text.md`);

		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(1);
	});
	it('should passthrough unchanged if no links present', async () => {
		const note = await importNote(`${supportDir}/test_notes/md/sample-no-links.md`);

		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(0);
		expect(note.body).toContain('Unidentified vessel travelling at sub warp speed, bearing 235.7. Fluctuations in energy readings from it, Captain. All transporters off.');
	});
	it('should import linked image with special characters in name', async () => {
		const note = await importNote(`${supportDir}/test_notes/md/sample-special-chars.md`);

		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(3);
		const noteIds = await Note.linkedNoteIds(note.body);
		expect(noteIds.length).toBe(1);
		const spaceSyntaxLeft = note.body.includes('<../../photo sample.jpg>');
		expect(spaceSyntaxLeft).toBe(false);
	});
	it('should import resources and notes for files', async () => {
		const note = await importNote(`${supportDir}/test_notes/md/sample-files.md`);

		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(3);
		const noteIds = await Note.linkedNoteIds(note.body);
		expect(noteIds.length).toBe(1);
	});
	it('should gracefully handle reference cycles in notes', async () => {
		await importNoteDirectory(`${supportDir}/test_notes/md/cycle-reference`);
		const [noteA, noteB] = await Note.all();

		const noteAIds = await Note.linkedNoteIds(noteA.body);
		expect(noteAIds.length).toBe(1);
		const noteBIds = await Note.linkedNoteIds(noteB.body);
		expect(noteBIds.length).toBe(1);
		expect(noteAIds[0]).toEqual(noteB.id);
		expect(noteBIds[0]).toEqual(noteA.id);
	});
	it('should not import resources from file:// links', async () => {
		const note = await importNote(`${supportDir}/test_notes/md/sample-file-links.md`);

		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(0);
		expect(note.body).toContain('![sample](file://../../photo.jpg)');
	});
	it('should attach resources that are missing the file extension', async () => {
		const note = await importNote(`${supportDir}/test_notes/md/sample-no-extension.md`);

		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(1);
	});
	it('should attach resources that include anchor links', async () => {
		const note = await importNote(`${supportDir}/test_notes/md/sample-anchor-link.md`);

		const itemIds = await Note.linkedItemIds(note.body);
		expect(itemIds.length).toBe(1);
		expect(note.body).toContain(`[Section 1](:/${itemIds[0]}#markdown)`);
	});
	it('should attach resources that include a title', async () => {
		const note = await importNote(`${supportDir}/test_notes/md/sample-link-title.md`);

		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(3);
		const noteIds = await Note.linkedNoteIds(note.body);
		expect(noteIds.length).toBe(1);
	});
	it('should import notes with html file extension as html', async () => {
		const note = await importNote(`${supportDir}/test_notes/md/sample.html`);

		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(3);
		const noteIds = await Note.linkedNoteIds(note.body);
		expect(noteIds.length).toBe(1);
		expect(note.markup_language).toBe(MarkupToHtml.MARKUP_LANGUAGE_HTML);
		const preservedAlt = note.body.includes('alt="../../photo.jpg"');
		expect(preservedAlt).toBe(true);
	});
	it('should import non-empty directory', async () => {
		await fs.mkdirp(`${tempDir}/non-empty/non-empty`);
		await fs.writeFile(`${tempDir}/non-empty/non-empty/sample.md`, '# Sample');

		await importNoteDirectory(`${tempDir}/non-empty`);
		const allFolders = await Folder.all();
		expect(allFolders.map((f: FolderEntity) => f.title).indexOf('non-empty')).toBeGreaterThanOrEqual(0);
	});
	it('should not import empty directory', async () => {
		await fs.mkdirp(`${tempDir}/empty1/empty2`);

		await importNoteDirectory(`${tempDir}/empty1`);
		const allFolders = await Folder.all();
		expect(allFolders.map((f: FolderEntity) => f.title).indexOf('empty1')).toBe(0);
		expect(allFolders.map((f: FolderEntity) => f.title).indexOf('empty2')).toBe(-1);
	});
	it('should import directory with non-empty subdirectory', async () => {
		await fs.mkdirp(`${tempDir}/non-empty-subdir/non-empty-subdir/subdir-empty`);
		await fs.mkdirp(`${tempDir}/non-empty-subdir/non-empty-subdir/subdir-non-empty`);
		await fs.writeFile(`${tempDir}/non-empty-subdir/non-empty-subdir/subdir-non-empty/sample.md`, '# Sample');

		await importNoteDirectory(`${tempDir}/non-empty-subdir`);
		const allFolders = await Folder.all();
		expect(allFolders.map((f: FolderEntity) => f.title).indexOf('non-empty-subdir')).toBeGreaterThanOrEqual(0);
		expect(allFolders.map((f: FolderEntity) => f.title).indexOf('subdir-empty')).toBe(-1);
		expect(allFolders.map((f: FolderEntity) => f.title).indexOf('subdir-non-empty')).toBeGreaterThanOrEqual(0);
	});

	it('should import all files before replacing links', async () => {
		await fs.mkdirp(`${tempDir}/links/0/1/2`);
		await fs.mkdirp(`${tempDir}/links/Target_folder`);
		await fs.writeFile(`${tempDir}/links/Target_folder/Targeted_note.md`, '# Targeted_note');
		await fs.writeFile(`${tempDir}/links/0/1/2/Note_with_reference_to_another_note.md`, '# 20\n[Target_folder:Targeted_note](../../../Target_folder/Targeted_note.md)');

		await importNoteDirectory(`${tempDir}/links`);

		const allFolders = await Folder.all();
		const allNotes = await Note.all();
		const targetFolder = allFolders.find(f => f.title === 'Target_folder');
		const noteBeingReferenced = allNotes.find(n => n.title === 'Targeted_note');

		expect(noteBeingReferenced.parent_id).toBe(targetFolder.id);
	});

	it('should not fail to import file that contains a link to a file that does not exist', async () => {
		// The first implicit test is that the below call doesn't throw due to the invalid image
		const note = await importNote(`${supportDir}/test_notes/md/invalid-image-link.md`);
		const links = Note.linkedItemIds(note.body);
		expect(links.length).toBe(1);
		const resource: ResourceEntity = await Resource.load(links[0]);
		// The invalid image is imported as-is
		expect(resource.title).toBe('invalid-image.jpg');
	});

	it('should not fail to import file that contains a malformed URI', async () => {
		// The first implicit test is that the below call doesn't throw due to the malformed URI
		const note = await importNote(`${supportDir}/test_notes/md/sample-malformed-uri.md`);
		const itemIds = Note.linkedItemIds(note.body);
		expect(itemIds.length).toBe(0);
		// The malformed link is imported as-is
		expect(note.body).toContain('![malformed link](https://malformed_uri/%E0%A4%A.jpg)');
	});

	it('should import resources from links with Windows path', async () => {
		const note = await importNote(`${supportDir}/test_notes/md/windows_path.html`);
		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(2);
		expect(items.find(i => i.title === 'sample.txt')).toBeTruthy();
		expect(items.find(i => i.title === 'photo.jpg')).toBeTruthy();
	});

	it.each([
		['<a name="525"/>', '<a name="525"></a>'],
		['<a name="525" id="test" class="link"/>', '<a name="525" id="test" class="link"></a>'],
		['<a name="test@#$%^&*()" data-value="hello&world"/>', '<a name="test@#$%^&*()" data-value="hello&world"></a>'],
		['<a name="525 href="#test"/>', '<a name="525 href="#test"></a>'],
		['<a name="525" <!-- comment --> href="#"/>', '<a name="525" <!-- comment --> href="#"></a>'],
		['<a name="525" title="a > b"/>', '<a name="525" title="a > b"></a>'],

		// Shouldn't break anything
		['<a/><a></a>', '<a/><a></a>'],
		['<a><br/></a>', '<a><br/></a>'],
		['<a><span>test</span></a>', '<a><span>test</span></a>'],
		['<a name="525"></a>', '<a name="525"></a>'],
		['<a>test</a>', '<a>test</a>'],
		[
			'<div><a href=":/0be7f50730194dd9b7d3b2834b8bfd58" rev="en_rl_none">First note</a> </div>',
			'<div><a href=":/0be7f50730194dd9b7d3b2834b8bfd58" rev="en_rl_none">First note</a> </div>',
		],
		[
			`<a name="525">
</a>`,
			`<a name="525">
</a>`,
		],
	])('should transform self closing a tag into two', async (original: string, result: string) => {
		const importer = new InteropService_Importer_Md();

		expect(importer.applyImportFixes(original)).toBe(result);
	});

	it('should import apply import fix on note imported from Yinxiang', async () => {
		const note = await importHTMLNote(`${supportDir}/test_notes/md/self-closing-anchor.html`);
		expect(note.body).toContain(`<body>
<a name="519"></a>
<h1>Second note</h1>
</body>`);
	});

	it('should handle importing resources without extension', async () => {
		await importNoteDirectory(`${supportDir}/test_notes/md/resources_without_extension`);
		const notes = await Note.all();
		const resources = await Resource.all();

		expect(notes.length).toBe(1);
		expect(resources.length).toBe(3);
		expect(resources[0].title).toBe('file1');
		expect(resources[0].file_extension).toBe('');
		expect(resources[1].title).toBe('file2');
		expect(resources[1].file_extension).toBe('');
		expect(resources[2].title).toBe('file3.text');
		expect(resources[2].file_extension).toBe('text');
	});

	it('should not fail when importing a file with a long URL', async () => {
		await importNote(`${supportDir}/test_notes/md/long-url.md`);
		const note: NoteEntity = (await Note.all())[0];
		expect(note.title).toBe('long-url');
		expect(note.body).toBe('# test for joplin import\n\n[https://l.facebook.com/l.php?u=https%3A%2F%2Fix.sk%2FNiBZH%3Futm\\_source%3DYouTube%2520Instagram%26utm\\_medium%3D2HIqFSGVVB2mFsVTJClrQ7ZnuGJaUt6hu1MNH0vUMjcrgWnUsK%26utm\\_campaign%3D%25F0%259F%2598%25A9%25F0%259F%2598%258E%25F0%259F%2598%25BF%25F0%259F%25A4%2594%25F0%259F%2598%25A9%25F0%259F%2599%2583%25F0%259F%25A4%25AF%25F0%259F%25A5%25B0%25F0%259F%2598%25AB%25F0%259F%2598%25BA%26utm\\_id%3D%25F0%259F%2598%258B%25F0%259F%2598%25A5%25F0%259F%25A4%25A1%25F0%259F%2598%25A0%25F0%259F%2598%2587%25F0%259F%25A5%25B4%25F0%259F%25A7%2590%25F0%259F%2598%258E%25F0%259F%2598%2582%25F0%259F%2598%259E%26utm\\_term%3D%25F0%259F%2598%2584%25F0%259F%25A4%25A9%25F0%259F%2599%2580%25F0%259F%2598%2593%25F0%259F%25A4%25AF%25F0%259F%25A4%25A5%25F0%259F%2591%25BE%25F0%259F%2591%25BF%25F0%259F%2598%25BD%25F0%259F%25A4%25A5%26utm\\_content%3D%25F0%259F%2591%25BD%25F0%259F%2598%25AB%25F0%259F%2591%25BF%25F0%259F%2598%25BD%25F0%259F%2598%25A9%25F0%259F%2599%2589%26fbclid%3DIwAR0I3l5DBLypLaTjDTCGPQ1i1MmPB2-pE8iqrxrgUK9Kkvq3OX5Mjejibzw&h=AT3nNxW4G-9nAkhXU1EVN-aVGl1o\\_-DzDAaWFx9xbprpN3JRBOh17lCQQHNAlIMv6iE4P2vobBAAivLvdzy00K8xqIqb-CvGj6YnnBX6R9wwtj5Y&\\_\\_tn\\_\\_=H-y-R&c[0]=AT0eE6OXx\\_t9HzpPmMgTdOWAw2ZRNPRDIHJWf699NZYkYzugbWS6g3rOndhPA8fwrCIgk1zn2D1To7phLW9wXkqfgZU1ayT3887\\_dxrfN-x822Pos0lCjTIhoQcxfBl516pTz1XrRG\\_MbtPpLzUFAGu4nw5W86UR1EkBCZhustNbgTX4wVReiVSuwAWu7Sp1yiWvUm5JXlo76663333hhsgsu](<https://l.facebook.com/l.php?u=https%3A%2F%2Fix.sk%2FNiBZH%3Futm_source%3DYouTube%2520Instagram%26utm_medium%3D2HIqFSGVVB2mFsVTJClrQ7ZnuGJaUt6hu1MNH0vUMjcrgWnUsK%26utm_campaign%3D%25F0%259F%2598%25A9%25F0%259F%2598%258E%25F0%259F%2598%25BF%25F0%259F%25A4%2594%25F0%259F%2598%25A9%25F0%259F%2599%2583%25F0%259F%25A4%25AF%25F0%259F%25A5%25B0%25F0%259F%2598%25AB%25F0%259F%2598%25BA%26utm_id%3D%25F0%259F%2598%258B%25F0%259F%2598%25A5%25F0%259F%25A4%25A1%25F0%259F%2598%25A0%25F0%259F%2598%2587%25F0%259F%25A5%25B4%25F0%259F%25A7%2590%25F0%259F%2598%258E%25F0%259F%2598%2582%25F0%259F%2598%259E%26utm_term%3D%25F0%259F%2598%2584%25F0%259F%25A4%25A9%25F0%259F%2599%2580%25F0%259F%2598%2593%25F0%259F%25A4%25AF%25F0%259F%25A4%25A5%25F0%259F%2591%25BE%25F0%259F%2591%25BF%25F0%259F%2598%25BD%25F0%259F%25A4%25A5%26utm_content%3D%25F0%259F%2591%25BD%25F0%259F%2598%25AB%25F0%259F%2591%25BF%25F0%259F%2598%25BD%25F0%259F%2598%25A9%25F0%259F%2599%2589%26fbclid%3DIwAR0I3l5DBLypLaTjDTCGPQ1i1MmPB2-pE8iqrxrgUK9Kkvq3OX5Mjejibzw&h=AT3nNxW4G-9nAkhXU1EVN-aVGl1o_-DzDAaWFx9xbprpN3JRBOh17lCQQHNAlIMv6iE4P2vobBAAivLvdzy00K8xqIqb-CvGj6YnnBX6R9wwtj5Y&__tn__=H-y-R&c[0]=AT0eE6OXx_t9HzpPmMgTdOWAw2ZRNPRDIHJWf699NZYkYzugbWS6g3rOndhPA8fwrCIgk1zn2D1To7phLW9wXkqfgZU1ayT3887_dxrfN-x822Pos0lCjTIhoQcxfBl516pTz1XrRG_MbtPpLzUFAGu4nw5W86UR1EkBCZhustNbgTX4wVReiVSuwAWu7Sp1yiWvUm5JXlo>)');
	});
});
