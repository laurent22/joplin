import InteropService_Importer_Md from '../../services/interop/InteropService_Importer_Md';
import Note from '../../models/Note';
import { setupDatabaseAndSynchronizer, supportDir, switchClient } from '../../testing/test-utils';
import { MarkupToHtml } from '@joplin/renderer';


describe('InteropService_Importer_Md: importLocalImages', function() {
	async function importNote(path: string) {
		const importer = new InteropService_Importer_Md();
		importer.setMetadata({ fileExtensions: ['md', 'html'] });
		return await importer.importFile(path, 'notebook');
	}

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});
	it('should import linked files and modify tags appropriately', async function() {
		const note = await importNote(`${supportDir}/test_notes/md/sample.md`);

		const tagNonExistentFile = '![does not exist](does_not_exist.png)';
		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(2);
		const inexistentLinkUnchanged = note.body.includes(tagNonExistentFile);
		expect(inexistentLinkUnchanged).toBe(true);
	});
	it('should only create 1 resource for duplicate links, all tags should be updated', async function() {
		const note = await importNote(`${supportDir}/test_notes/md/sample-duplicate-links.md`);

		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(1);
		const reg = new RegExp(items[0].id, 'g');
		const matched = note.body.match(reg);
		expect(matched.length).toBe(2);
	});
	it('should import linked files and modify tags appropriately when link is also in alt text', async function() {
		const note = await importNote(`${supportDir}/test_notes/md/sample-link-in-alt-text.md`);

		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(1);
	});
	it('should passthrough unchanged if no links present', async function() {
		const note = await importNote(`${supportDir}/test_notes/md/sample-no-links.md`);

		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(0);
		expect(note.body).toContain('Unidentified vessel travelling at sub warp speed, bearing 235.7. Fluctuations in energy readings from it, Captain. All transporters off.');
	});
	it('should import linked image with special characters in name', async function() {
		const note = await importNote(`${supportDir}/test_notes/md/sample-special-chars.md`);

		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(3);
		const noteIds = await Note.linkedNoteIds(note.body);
		expect(noteIds.length).toBe(1);
		const spaceSyntaxLeft = note.body.includes('<../../photo sample.jpg>');
		expect(spaceSyntaxLeft).toBe(false);
	});
	it('should import resources and notes for files', async function() {
		const note = await importNote(`${supportDir}/test_notes/md/sample-files.md`);

		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(3);
		const noteIds = await Note.linkedNoteIds(note.body);
		expect(noteIds.length).toBe(1);
	});
	it('should gracefully handle reference cycles in notes', async function() {
		const importer = new InteropService_Importer_Md();
		importer.setMetadata({ fileExtensions: ['md'] });
		const noteA = await importer.importFile(`${supportDir}/test_notes/md/sample-cycles-a.md`, 'notebook');
		const noteB = await importer.importFile(`${supportDir}/test_notes/md/sample-cycles-b.md`, 'notebook');

		const noteAIds = await Note.linkedNoteIds(noteA.body);
		expect(noteAIds.length).toBe(1);
		const noteBIds = await Note.linkedNoteIds(noteB.body);
		expect(noteBIds.length).toBe(1);
		expect(noteAIds[0]).toEqual(noteB.id);
		expect(noteBIds[0]).toEqual(noteA.id);
	});
	it('should not import resources from file:// links', async function() {
		const note = await importNote(`${supportDir}/test_notes/md/sample-file-links.md`);

		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(0);
		expect(note.body).toContain('![sample](file://../../photo.jpg)');
	});
	it('should attach resources that are missing the file extension', async function() {
		const note = await importNote(`${supportDir}/test_notes/md/sample-no-extension.md`);

		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(1);
	});
	it('should attach resources that include anchor links', async function() {
		const note = await importNote(`${supportDir}/test_notes/md/sample-anchor-link.md`);

		const itemIds = await Note.linkedItemIds(note.body);
		expect(itemIds.length).toBe(1);
		expect(note.body).toContain(`[Section 1](:/${itemIds[0]}#markdown)`);
	});
	it('should attach resources that include a title', async function() {
		const note = await importNote(`${supportDir}/test_notes/md/sample-link-title.md`);

		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(3);
		const noteIds = await Note.linkedNoteIds(note.body);
		expect(noteIds.length).toBe(1);
	});
	it('should import notes with html file extension as html', async function() {
		const note = await importNote(`${supportDir}/test_notes/md/sample.html`);

		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(3);
		const noteIds = await Note.linkedNoteIds(note.body);
		expect(noteIds.length).toBe(1);
		expect(note.markup_language).toBe(MarkupToHtml.MARKUP_LANGUAGE_HTML);
		const preservedAlt = note.body.includes('alt="../../photo.jpg"');
		expect(preservedAlt).toBe(true);
	});
});
