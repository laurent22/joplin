const mdImporterService = require('lib/services/InteropService_Importer_Md');
const Note = require('lib/models/Note.js');
const { setupDatabaseAndSynchronizer, switchClient } = require('test-utils.js');

const importer = new mdImporterService();


describe('InteropService_Importer_Md: importLocalImages', function() {
	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});
	it('should import linked files and modify tags appropriately', async function() {
		const tagNonExistentFile = '![does not exist](does_not_exist.png)';
		const note = await importer.importFile(`${__dirname}/md_to_md/sample.md`, 'notebook');
		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(2);
		const inexistentLinkUnchanged = note.body.includes(tagNonExistentFile);
		expect(inexistentLinkUnchanged).toBe(true);
	});
	it('should only create 1 resource for duplicate links, all tags should be updated', async function() {
		const note = await importer.importFile(`${__dirname}/md_to_md/sample-duplicate-links.md`, 'notebook');
		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(1);
		const reg = new RegExp(items[0].id, 'g');
		const matched = note.body.match(reg);
		expect(matched.length).toBe(2);
	});
	it('should import linked files and modify tags appropriately when link is also in alt text', async function() {
		const note = await importer.importFile(`${__dirname}/md_to_md/sample-link-in-alt-text.md`, 'notebook');
		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(1);
	});
	it('should passthrough unchanged if no links present', async function() {
		const note = await importer.importFile(`${__dirname}/md_to_md/sample-no-links.md`, 'notebook');
		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(0);
		expect(note.body).toContain('Unidentified vessel travelling at sub warp speed, bearing 235.7. Fluctuations in energy readings from it, Captain. All transporters off.');
	});
	it('should import linked image with special characters in name', async function() {
		const note = await importer.importFile(`${__dirname}/md_to_md/sample-special-chars.md`, 'notebook');
		const items = await Note.linkedItems(note.body);
		expect(items.length).toBe(1);
	});
});
