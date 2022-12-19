import { revisionService, setupDatabaseAndSynchronizer, db, switchClient, msleep } from '../testing/test-utils';
import SearchEngine from '../services/searchengine/SearchEngine';
import ResourceService from '../services/ResourceService';
import ItemChangeUtils from '../services/ItemChangeUtils';
import Note from '../models/Note';
import ItemChange from '../models/ItemChange';

let searchEngine: SearchEngine = null;

describe('models/ItemChange', function() {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		searchEngine = new SearchEngine();
		searchEngine.setDb(db());
	});

	it('should delete old changes that have been processed', (async () => {
		await Note.save({ title: 'abcd efgh' });

		await ItemChange.waitForAllSaved();

		expect(await ItemChange.lastChangeId()).toBe(1);

		const resourceService = new ResourceService();

		await searchEngine.syncTables();

		// If we run this now, it should not delete any change because
		// the resource service has not yet processed the change
		await ItemChangeUtils.deleteProcessedChanges(0);
		expect(await ItemChange.lastChangeId()).toBe(1);

		await resourceService.indexNoteResources();
		await ItemChangeUtils.deleteProcessedChanges(0);
		expect(await ItemChange.lastChangeId()).toBe(1);

		await revisionService().collectRevisions();

		// If we don't set a TTL it will default to 90 days so it won't delete
		// either.
		await ItemChangeUtils.deleteProcessedChanges();
		expect(await ItemChange.lastChangeId()).toBe(1);

		// All changes should be at least 4 ms old now
		await msleep(4);

		// Now it should delete all changes older than 3 ms
		await ItemChangeUtils.deleteProcessedChanges(3);
		expect(await ItemChange.lastChangeId()).toBe(0);
	}));

});
