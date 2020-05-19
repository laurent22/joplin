/* eslint-disable no-unused-vars */
/* eslint prefer-const: 0*/

require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, asyncTest, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const SearchEngine = require('lib/services/searchengine/SearchEngine');
const Note = require('lib/models/Note');
const Tag = require('lib/models/Tag');
const ItemChange = require('lib/models/ItemChange');
const Setting = require('lib/models/Setting');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

let engine = null;

const ids = (array) => array.map(a => a.id);

// For pretty printing.
// See https://stackoverflow.com/questions/23676459/karma-jasmine-pretty-printing-object-comparison/26324116
// jasmine.pp = function(obj) {
// 	return JSON.stringify(obj, undefined, 2);
//   };

describe('services_SearchFilter', function() {
	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);

		engine = new SearchEngine();
		engine.setDb(db());

		done();
	});


	it('should return note matching title', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'abcd', body: 'body 1' });
		const n2 = await Note.save({ title: 'efgh', body: 'body 2' });

		await engine.syncTables();
		rows = await engine.search('title: abcd');

		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n1.id);
	}));

	it('should return note matching body', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'abcd', body: 'body1' });
		const n2 = await Note.save({ title: 'efgh', body: 'body2' });

		await engine.syncTables();
		rows = await engine.search('body: body1');

		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n1.id);
	}));

	it('should return note matching title containing multiple words', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'abcd xyz', body: 'body1' });
		const n2 = await Note.save({ title: 'efgh ijk', body: 'body2' });

		await engine.syncTables();
		rows = await engine.search('title: "abcd xyz"');

		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n1.id);
	}));

	it('should return note matching body containing multiple words', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'abcd', body: 'ho ho ho' });
		const n2 = await Note.save({ title: 'efgh', body: 'foo bar' });

		await engine.syncTables();
		rows = await engine.search('body: "foo bar"');

		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n2.id);
	}));

	it('should return note matching title AND body', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'abcd', body: 'ho ho ho' });
		const n2 = await Note.save({ title: 'efgh', body: 'foo bar' });

		await engine.syncTables();
		rows = await engine.search('title: efgh body: "foo bar"');
		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n2.id);

		rows = await engine.search('title: abcd body: "foo bar"');
		expect(rows.length).toBe(0);
	}));

	it('should return note matching title OR body', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'abcd', body: 'ho ho ho' });
		const n2 = await Note.save({ title: 'efgh', body: 'foo bar' });

		await engine.syncTables();
		rows = await engine.search('title: abcd OR body: "foo bar"');
		expect(rows.length).toBe(2);
		expect(rows.map(r=>r.id)).toContain(n1.id);
		expect(rows.map(r=>r.id)).toContain(n2.id);

		rows = await engine.search('title: wxyz OR body: "blah blah"');
		expect(rows.length).toBe(0);
	}));

	it('should return notes matching text', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'foo beef', body: 'dead bar' });
		const n2 = await Note.save({ title: 'bar efgh', body: 'foo dog' });
		await engine.syncTables();

		// Interpretation: Match with notes containing foo in title/body and bar in title/body
		// Note: This is NOT saying to match notes containing foo bar in title/body
		rows = await engine.search('foo bar');
		expect(rows.length).toBe(2);
		expect(rows.map(r=>r.id)).toContain(n1.id);
		expect(rows.map(r=>r.id)).toContain(n2.id);

		rows = await engine.search('foo efgh');
		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n2.id);

		rows = await engine.search('zebra');
		expect(rows.length).toBe(0);
	}));

	it('should support phrase search', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'foo beef', body: 'bar dog' });
		const n2 = await Note.save({ title: 'bar efgh', body: 'foo dog' });
		await engine.syncTables();

		rows = await engine.search('"bar dog"');
		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n1.id);
	}));

	it('should support prefix search', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'foo beef', body: 'bar dog' });
		const n2 = await Note.save({ title: 'bar efgh', body: 'foo dog' });
		await engine.syncTables();

		rows = await engine.search('"bar*"');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);
	}));


	it('should support filtering by tags', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'foo beef', body: 'bar dog' });
		const n2 = await Note.save({ title: 'bar efgh', body: 'foo dog' });
		const n3 = await Note.save({ title: 'storm front', body: 'wicked wizard' });

		await Tag.setNoteTagsByTitles(n1.id, ['tag1', 'tag2']);
		await Tag.setNoteTagsByTitles(n2.id, ['tag2', 'tag3']);
		await Tag.setNoteTagsByTitles(n3.id, ['tag3', 'tag4']);
		await sleep(0.1);

		await engine.syncTables();

		rows = await engine.search('tag:tag2');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('tag:tag2 tag:tag3');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('tag:tag1 OR tag:tag2 OR tag:tag3');
		expect(rows.length).toBe(3);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);
		expect(ids(rows)).toContain(n3.id);

		rows = await engine.search('tag:tag2 tag:tag3 tag:tag4');
		expect(rows.length).toBe(0);
	}));


});
