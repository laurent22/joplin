const InteropService_Importer_Md = require('../../services/interop/InteropService_Importer_Md').default;
const Note = require('../../models/Note').default;
import { setupDatabaseAndSynchronizer, supportDir, switchClient } from '../../testing/test-utils';


describe('InteropService_Importer_Md: importLocalImages', function() {
	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});
	it('should import linked files and modify tags appropriately', async function() {
		const importer = new InteropService_Importer_Md();
		// This isn't the same as what's in lib/services/interop/InteropService.ts
		// But it is sufficient to run these tests
		importer.setMetadata({ fileExtensions: ['md'] });
		const tagNonExistentFile = '![does not exist](does_not_exist.png)';
		const note = await importer.importFile(`${supportDir}/test_notes/md/sample.md`, 'notebook');
		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(2);
		const inexistentLinkUnchanged = note.body.includes(tagNonExistentFile);
		expect(inexistentLinkUnchanged).toBe(true);
	});
	it('should only create 1 resource for duplicate links, all tags should be updated', async function() {
		const importer = new InteropService_Importer_Md();
		// This isn't the same as what's in lib/services/interop/InteropService.ts
		// But it is sufficient to run these tests
		importer.setMetadata({ fileExtensions: ['md'] });
		const note = await importer.importFile(`${supportDir}/test_notes/md/sample-duplicate-links.md`, 'notebook');
		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(1);
		const reg = new RegExp(items[0].id, 'g');
		const matched = note.body.match(reg);
		expect(matched.length).toBe(2);
	});
	it('should import linked files and modify tags appropriately when link is also in alt text', async function() {
		const importer = new InteropService_Importer_Md();
		// This isn't the same as what's in lib/services/interop/InteropService.ts
		// But it is sufficient to run these tests
		importer.setMetadata({ fileExtensions: ['md'] });
		const note = await importer.importFile(`${supportDir}/test_notes/md/sample-link-in-alt-text.md`, 'notebook');
		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(1);
	});
	it('should passthrough unchanged if no links present', async function() {
		const importer = new InteropService_Importer_Md();
		// This isn't the same as what's in lib/services/interop/InteropService.ts
		// But it is sufficient to run these tests
		importer.setMetadata({ fileExtensions: ['md'] });
		const note = await importer.importFile(`${supportDir}/test_notes/md/sample-no-links.md`, 'notebook');
		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(0);
		expect(note.body).toContain('Unidentified vessel travelling at sub warp speed, bearing 235.7. Fluctuations in energy readings from it, Captain. All transporters off.');
	});
	it('should import linked image with special characters in name', async function() {
		const importer = new InteropService_Importer_Md();
		// This isn't the same as what's in lib/services/interop/InteropService.ts
		// But it is sufficient to run these tests
		importer.setMetadata({ fileExtensions: ['md'] });
		const note = await importer.importFile(`${supportDir}/test_notes/md/sample-special-chars.md`, 'notebook');
		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(1);
	});
	it('should import resources and notes for files', async function() {
		const importer = new InteropService_Importer_Md();
		// This isn't the same as what's in lib/services/interop/InteropService.ts
		// But it is sufficient to run these tests
		importer.setMetadata({ fileExtensions: ['md'] });
		const note = await importer.importFile(`${supportDir}/test_notes/md/sample-files.md`, 'notebook');
		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(3);
		const noteIds = await Note.linkedNoteIds(note.body);
		expect(noteIds.length).toBe(1);
	});
	it('should gracefully handle reference cycles in notes', async function() {
		const importer = new InteropService_Importer_Md();
		// This isn't the same as what's in lib/services/interop/InteropService.ts
		// But it is sufficient to run these tests
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
});
