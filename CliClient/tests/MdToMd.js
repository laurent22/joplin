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
		let items = await Note.linkedItems(note.body);
		expect(items.length).toBe(2);
		const inexistentLinkUnchanged = note.body.includes(tagNonExistentFile);
		expect(inexistentLinkUnchanged).toBe(true);
	});
	it('should not result in linked items if no links present', async function() {
		const note = await importer.importFile(`${__dirname}/md_to_md/sample-no-links.md`, 'notebook');
		let items = await Note.linkedItems(note.body);
		expect(items.length).toBe(0);
	});
});
