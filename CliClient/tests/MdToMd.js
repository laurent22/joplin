const mdImporterService = require('lib/services/InteropService_Importer_Md');
const Note = require('lib/models/Note.js');
const { setupDatabaseAndSynchronizer, switchClient } = require('test-utils.js');

const importer = new mdImporterService()

const filePath = `${__dirname}/md_to_md/sample.md`

const tagNonExistentFile = '![does not exist](does_not_exist.png)'

describe('InteropService_Importer_Md', function() {
    describe('importLocalImages method', function() {
	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});
        it('should import linked files and modify tags appropriately', async function() {
            const note = await importer.importFile(filePath, 'notebook');
            let items = await Note.linkedItems(note.body);
            expect(items.length).toBe(2)
            const inexistentLinkUnchanged = note.body.includes(tagNonExistentFile)
            expect(inexistentLinkUnchanged).toBe(true)
        })
    })
})
