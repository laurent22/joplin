require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const markdownUtils = require('lib/markdownUtils.js');
const SearchEngine = require('lib/services/SearchEngine');
const Folder = require('lib/models/Folder');
const Note = require('lib/models/Note');
const ItemChange = require('lib/models/ItemChange');
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
		await engine.dropFtsTables();
		await engine.createFtsTables();
		
		done();
	});

	it('should create the FTS table', async (done) => {
		let rows;

		await Note.save({ title: "abcd efgh" });
		rows = await engine.search('abcd efgh');
		expect(rows.length).toBe(0);

		rows = await engine.search('abcd efgh');
		expect(await engine.countRows()).toBe(1);

		done();
	});

	it('should update the FTS table', async (done) => {
		let rows;

		expect(await engine.countRows()).toBe(0);

		await Note.save({ title: "abcd efgh" });
		await engine.updateFtsTables();
		expect(await engine.countRows()).toBe(1);

		await Note.save({ title: "abcd efgh" });
		await engine.updateFtsTables();
		expect(await engine.countRows()).toBe(2);

		await engine.updateFtsTables();
		expect(await engine.countRows()).toBe(2);

		done();
	});

	it('should order search results by relevance', async (done) => {
		// 1
		const n1 = await Note.save({ title: "abcd efgh", body: "XX abcd XX efgh" });
		// 4
		const n2 = await Note.save({ title: "abcd aaaaa bbbb eeee efgh" });
		// 3
		const n3 = await Note.save({ title: "abcd aaaaa efgh" });
		// 2
		const n4 = await Note.save({ title: "blablablabla blabla bla abcd X efgh" });
		// 5
		const n5 = await Note.save({ title: "occurence many times but very abcd spread appart spread appart spread appart spread appart spread appart efgh occurence many times but very abcd spread appart spread appart spread appart spread appart spread appart efgh occurence many times but very abcd spread appart spread appart spread appart spread appart spread appart efgh occurence many times but very abcd spread appart spread appart spread appart spread appart spread appart efgh occurence many times but very abcd spread appart spread appart spread appart spread appart spread appart efgh" });

		await engine.updateFtsTables();

		const rows = await engine.search('abcd efgh');

		expect(rows[0].id).toBe(n1.id);
		expect(rows[1].id).toBe(n4.id);
		expect(rows[2].id).toBe(n3.id);
		expect(rows[3].id).toBe(n2.id);
		expect(rows[4].id).toBe(n5.id);

		done();
	});

	it('should supports various query types', async (done) => {
		let rows;

		const n1 = await Note.save({ title: "abcd efgh ijkl", body: "aaaa bbbb" });
		const n2 = await Note.save({ title: "iiii efgh bbbb", body: "aaaa bbbb" });

		await engine.updateFtsTables();

		rows = await engine.search('abcd ijkl');
		expect(rows.length).toBe(1);

		rows = await engine.search('"abcd ijkl"');
		expect(rows.length).toBe(0);

		rows = await engine.search('"abcd efgh"');
		expect(rows.length).toBe(1);

		rows = await engine.search('title:abcd');
		expect(rows.length).toBe(1);

		rows = await engine.search('title:efgh');
		expect(rows.length).toBe(2);

		rows = await engine.search('body:abcd');
		expect(rows.length).toBe(0);

		rows = await engine.search('body:bbbb');
		expect(rows.length).toBe(2);

		rows = await engine.search('body:bbbb iiii');
		expect(rows.length).toBe(1);

		done();
	});

});