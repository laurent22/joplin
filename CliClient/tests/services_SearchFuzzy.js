/* eslint-disable no-unused-vars */
/* eslint prefer-const: 0*/

require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, asyncTest, db, synchronizer, fileApi, sleep, createNTestNotes, switchClient, createNTestFolders } = require('test-utils.js');
const SearchEngine = require('lib/services/searchengine/SearchEngine');
const Note = require('lib/models/Note');
const Folder = require('lib/models/Folder');
const Tag = require('lib/models/Tag');
const ItemChange = require('lib/models/ItemChange');
const Setting = require('lib/models/Setting');
const Resource = require('lib/models/Resource.js');
const { shim } = require('lib/shim');
const ResourceService = require('lib/services/ResourceService.js');


process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

let engine = null;

const ids = (array) => array.map(a => a.id);

describe('services_SearchFuzzy', function() {
	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);

		engine = new SearchEngine();
		engine.setDb(db());

		Setting.setValue('db.fuzzySearchEnabled', 1);
		done();
	});


	it('should return note almost matching title', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'If It Ain\'t Baroque, Don\'t Fix It' });
		const n2 = await Note.save({ title: 'Important note' });
		// const n2 = await Note.save({ title: 'efgh', body: 'body 2' });

		await engine.syncTables();
		rows = await engine.search('Broke', { fuzzy: false });
		expect(rows.length).toBe(0);

		rows = await engine.search('Broke', { fuzzy: true });
		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n1.id);


		rows = await engine.search('title:Broke', { fuzzy: true });
		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n1.id);

		rows = await engine.search('title:"Broke"', { fuzzy: true });
		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n1.id);

		rows = await engine.search('Imprtant', { fuzzy: true });
		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n2.id);
		// console.log(rows);
	}));


});
