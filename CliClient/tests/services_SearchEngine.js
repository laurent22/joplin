require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const markdownUtils = require('lib/markdownUtils.js');
const SearchEngine = require('lib/services/SearchEngine');
const Folder = require('lib/models/Folder');
const Note = require('lib/models/Note');
const Tag = require('lib/models/Tag');
const Resource = require('lib/models/Resource');

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

let engine = null;

describe('services_SearchEngine', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		engine = new SearchEngine();
		engine.setDb(db());
		done();
	});

	it('should create the FTS table', async (done) => {
		await Note.save({ title: "abcd efgh" });
		await Note.save({ title: "abcd aaaaa bbbb eeee efgh" });
		await Note.save({ title: "abcd aaaaa efgh" });
		await Note.save({ title: "blablablabla blabla bla abcd X efgh" });
		await Note.save({ title: "occurence many times but very abcd spread appart spread appart spread appart spread appart spread appart efgh occurence many times but very abcd spread appart spread appart spread appart spread appart spread appart efgh occurence many times but very abcd spread appart spread appart spread appart spread appart spread appart efgh occurence many times but very abcd spread appart spread appart spread appart spread appart spread appart efgh occurence many times but very abcd spread appart spread appart spread appart spread appart spread appart efgh" });

		await engine.updateFtsTables();

		done();
	});

});