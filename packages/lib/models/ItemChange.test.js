const { revisionService, setupDatabaseAndSynchronizer, db, switchClient } = require('../testing/test-utils.js');
const SearchEngine = require('../services/searchengine/SearchEngine').default;
const ResourceService = require('../services/ResourceService').default;
const ItemChangeUtils = require('../services/ItemChangeUtils').default;
const Note = require('../models/Note').default;
const ItemChange = require('../models/ItemChange').default;

let searchEngine = null;

describe('models_ItemChange', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		searchEngine = new SearchEngine();
		searchEngine.setDb(db());
		done();
	});

	it('should delete old changes that have been processed', (async () => {
		await Note.save({ title: 'abcd efgh' });

		await ItemChange.waitForAllSaved();

		expect(await ItemChange.lastChangeId()).toBe(1);

		const resourceService = new ResourceService();

		await searchEngine.syncTables();
		// If we run this now, it should not delete any change because
		// the resource service has not yet processed the change
		await ItemChangeUtils.deleteProcessedChanges();
		expect(await ItemChange.lastChangeId()).toBe(1);

		await resourceService.indexNoteResources();
		await ItemChangeUtils.deleteProcessedChanges();
		expect(await ItemChange.lastChangeId()).toBe(1);

		await revisionService().collectRevisions();
		await ItemChangeUtils.deleteProcessedChanges();
		expect(await ItemChange.lastChangeId()).toBe(0);
	}));

});
