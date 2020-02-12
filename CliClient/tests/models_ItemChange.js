/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { asyncTest, fileContentEqual, revisionService, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const SearchEngine = require('lib/services/SearchEngine');
const ResourceService = require('lib/services/ResourceService');
const ItemChangeUtils = require('lib/services/ItemChangeUtils');
const Note = require('lib/models/Note');
const Setting = require('lib/models/Setting');
const ItemChange = require('lib/models/ItemChange');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

let searchEngine = null;

describe('models_ItemChange', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		searchEngine = new SearchEngine();
		searchEngine.setDb(db());
		done();
	});

	it('should delete old changes that have been processed', asyncTest(async () => {
		const n1 = await Note.save({ title: 'abcd efgh' }); // 3

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
