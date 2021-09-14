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

	it('should return note matching negated title', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'abcd', body: 'body 1' });
		const n2 = await Note.save({ title: 'efgh', body: 'body 2' });

		await engine.syncTables();
		rows = await engine.search('-title: abcd');

		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n2.id);
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

	it('should return note matching negated body', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'abcd', body: 'body1' });
		const n2 = await Note.save({ title: 'efgh', body: 'body2' });

		await engine.syncTables();
		rows = await engine.search('-body: body1');

		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n2.id);
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
		rows = await engine.search('any:1 title: abcd body: "foo bar"');
		expect(rows.length).toBe(2);
		expect(rows.map(r=>r.id)).toContain(n1.id);
		expect(rows.map(r=>r.id)).toContain(n2.id);

		rows = await engine.search('any:1 title: wxyz body: "blah blah"');
		expect(rows.length).toBe(0);
	}));

	it('should return notes matching text', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'foo beef', body: 'dead bar' });
		const n2 = await Note.save({ title: 'bar efgh', body: 'foo dog' });
		const n3 = await Note.save({ title: 'foo ho', body: 'ho ho ho' });
		await engine.syncTables();

		// Interpretation: Match with notes containing foo in title/body and bar in title/body
		// Note: This is NOT saying to match notes containing foo bar in title/body
		rows = await engine.search('foo bar');
		expect(rows.length).toBe(2);
		expect(rows.map(r=>r.id)).toContain(n1.id);
		expect(rows.map(r=>r.id)).toContain(n2.id);

		rows = await engine.search('foo -bar');
		expect(rows.length).toBe(1);
		expect(rows.map(r=>r.id)).toContain(n3.id);

		rows = await engine.search('foo efgh');
		expect(rows.length).toBe(1);
		expect(rows[0].id).toBe(n2.id);

		rows = await engine.search('zebra');
		expect(rows.length).toBe(0);
	}));

	it('should return notes matching any negated text', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'abc', body: 'def' });
		const n2 = await Note.save({ title: 'def', body: 'ghi' });
		const n3 = await Note.save({ title: 'ghi', body: 'jkl' });
		await engine.syncTables();

		rows = await engine.search('any:1 -abc -ghi');
		expect(rows.length).toBe(3);
		expect(rows.map(r=>r.id)).toContain(n1.id);
		expect(rows.map(r=>r.id)).toContain(n2.id);
		expect(rows.map(r=>r.id)).toContain(n3.id);
	}));

	it('should return notes matching any negated title', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'abc', body: 'def' });
		const n2 = await Note.save({ title: 'def', body: 'ghi' });
		const n3 = await Note.save({ title: 'ghi', body: 'jkl' });
		await engine.syncTables();

		rows = await engine.search('any:1 -title:abc -title:ghi');
		expect(rows.length).toBe(3);
		expect(rows.map(r=>r.id)).toContain(n1.id);
		expect(rows.map(r=>r.id)).toContain(n2.id);
		expect(rows.map(r=>r.id)).toContain(n3.id);
	}));

	it('should return notes matching any negated body', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'abc', body: 'def' });
		const n2 = await Note.save({ title: 'def', body: 'ghi' });
		const n3 = await Note.save({ title: 'ghi', body: 'jkl' });
		await engine.syncTables();

		rows = await engine.search('any:1 -body:xyz -body:ghi');
		expect(rows.length).toBe(3);
		expect(rows.map(r=>r.id)).toContain(n1.id);
		expect(rows.map(r=>r.id)).toContain(n2.id);
		expect(rows.map(r=>r.id)).toContain(n3.id);
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
		const n1 = await Note.save({ title: 'But I would', body: 'walk 500 miles' });
		const n2 = await Note.save({ title: 'And I would', body: 'walk 500 more' });
		const n3 = await Note.save({ title: 'Just to be', body: 'the man who' });
		const n4 = await Note.save({ title: 'walked a thousand', body: 'miles to fall' });
		const n5 = await Note.save({ title: 'down at your', body: 'door' });

		await Tag.setNoteTagsByTitles(n1.id, ['Da', 'da', 'lat', 'da']);
		await Tag.setNoteTagsByTitles(n2.id, ['Da', 'da', 'lat', 'da']);

		await engine.syncTables();

		rows = await engine.search('tag:*');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('-tag:*');
		expect(rows.length).toBe(3);
		expect(ids(rows)).toContain(n3.id);
		expect(ids(rows)).toContain(n4.id);
		expect(ids(rows)).toContain(n5.id);
	}));


	it('should support filtering by tags', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'peace talks', body: 'battle ground' });
		const n2 = await Note.save({ title: 'mouse', body: 'mister' });
		const n3 = await Note.save({ title: 'dresden files', body: 'harry dresden' });

		await Tag.setNoteTagsByTitles(n1.id, ['tag1', 'tag2']);
		await Tag.setNoteTagsByTitles(n2.id, ['tag2', 'tag3']);
		await Tag.setNoteTagsByTitles(n3.id, ['tag3', 'tag4']);

		await engine.syncTables();

		rows = await engine.search('tag:tag2');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('tag:tag2 tag:tag3');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('any:1 tag:tag1 tag:tag2 tag:tag3');
		expect(rows.length).toBe(3);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);
		expect(ids(rows)).toContain(n3.id);

		rows = await engine.search('tag:tag2 tag:tag3 tag:tag4');
		expect(rows.length).toBe(0);

		rows = await engine.search('-tag:tag2');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n3.id);

		rows = await engine.search('-tag:tag2 -tag:tag3');
		expect(rows.length).toBe(0);

		rows = await engine.search('-tag:tag2 -tag:tag3');
		expect(rows.length).toBe(0);

		rows = await engine.search('any:1 -tag:tag2 -tag:tag3');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n3.id);
	}));

	it('should support filtering by notebook', asyncTest(async () => {
		let rows;
		const folder0 = await Folder.save({ title: 'notebook0' });
		const folder1 = await Folder.save({ title: 'notebook1' });
		const notes0 = await createNTestNotes(5, folder0);
		const notes1 = await createNTestNotes(5, folder1);

		await engine.syncTables();

		rows = await engine.search('notebook:notebook0');
		expect(rows.length).toBe(5);
		expect(ids(rows).sort()).toEqual(ids(notes0).sort());

	}));

	it('should support filtering by nested notebook', asyncTest(async () => {
		let rows;
		const folder0 = await Folder.save({ title: 'notebook0' });
		const folder00 = await Folder.save({ title: 'notebook00', parent_id: folder0.id });
		const folder1 = await Folder.save({ title: 'notebook1' });
		const notes0 = await createNTestNotes(5, folder0);
		const notes00 = await createNTestNotes(5, folder00);
		const notes1 = await createNTestNotes(5, folder1);

		await engine.syncTables();

		rows = await engine.search('notebook:notebook0');
		expect(rows.length).toBe(10);
		expect(ids(rows).sort()).toEqual(ids(notes0.concat(notes00)).sort());
	}));

	it('should support filtering by multiple notebooks', asyncTest(async () => {
		let rows;
		const folder0 = await Folder.save({ title: 'notebook0' });
		const folder00 = await Folder.save({ title: 'notebook00', parent_id: folder0.id });
		const folder1 = await Folder.save({ title: 'notebook1' });
		const folder2 = await Folder.save({ title: 'notebook2' });
		const notes0 = await createNTestNotes(5, folder0);
		const notes00 = await createNTestNotes(5, folder00);
		const notes1 = await createNTestNotes(5, folder1);
		const notes2 = await createNTestNotes(5, folder2);

		await engine.syncTables();

		rows = await engine.search('notebook:notebook0 notebook:notebook1');
		expect(rows.length).toBe(15);
		expect(ids(rows).sort()).toEqual(ids(notes0).concat(ids(notes00).concat(ids(notes1))).sort());
	}));

	it('should support filtering by created date', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'I made this on', body: 'May 20 2020', user_created_time: Date.parse('2020-05-20') });
		const n2 = await Note.save({ title: 'I made this on', body: 'May 19 2020', user_created_time: Date.parse('2020-05-19') });
		const n3 = await Note.save({ title: 'I made this on', body: 'May 18 2020', user_created_time: Date.parse('2020-05-18') });

		await engine.syncTables();

		rows = await engine.search('created:20200520');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n1.id);

		rows = await engine.search('created:20200519');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('-created:20200519');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n3.id);

	}));

	it('should support filtering by between two dates', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'January 01 2020', body: 'January 01 2020', user_created_time: Date.parse('2020-01-01') });
		const n2 = await Note.save({ title: 'February 15 2020', body: 'February 15 2020', user_created_time: Date.parse('2020-02-15') });
		const n3 = await Note.save({ title: 'March 25 2019', body: 'March 25 2019', user_created_time: Date.parse('2019-03-25') });
		const n4 = await Note.save({ title: 'March 01 2018', body: 'March 01 2018', user_created_time: Date.parse('2018-03-01') });

		await engine.syncTables();

		rows = await engine.search('created:20200101 -created:20200220');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('created:201901 -created:202002');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n3.id);
		expect(ids(rows)).toContain(n1.id);

		rows = await engine.search('created:2018 -created:2019');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n4.id);
	}));

	it('should support filtering by created with smart value: day', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'I made this', body: 'today', user_created_time: parseInt(time.goBackInTime(Date.now(), 0, 'day'), 10) });
		const n2 = await Note.save({ title: 'I made this', body: 'yesterday', user_created_time: parseInt(time.goBackInTime(Date.now(), 1, 'day'), 10) });
		const n3 = await Note.save({ title: 'I made this', body: 'day before yesterday', user_created_time: parseInt(time.goBackInTime(Date.now(), 2, 'day'), 10) });

		await engine.syncTables();

		rows = await engine.search('created:day-0');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n1.id);

		rows = await engine.search('created:day-1');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('created:day-2');
		expect(rows.length).toBe(3);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);
		expect(ids(rows)).toContain(n3.id);
	}));

	it('should support filtering by created with smart value: week', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'I made this', body: 'this week', user_created_time: parseInt(time.goBackInTime(Date.now(), 0, 'week'), 10) });
		const n2 = await Note.save({ title: 'I made this', body: 'the week before', user_created_time: parseInt(time.goBackInTime(Date.now(), 1, 'week'), 10) });
		const n3 = await Note.save({ title: 'I made this', body: 'before before week', user_created_time: parseInt(time.goBackInTime(Date.now(), 2, 'week'), 10) });

		await engine.syncTables();

		rows = await engine.search('created:week-0');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n1.id);

		rows = await engine.search('created:week-1');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('created:week-2');
		expect(rows.length).toBe(3);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);
		expect(ids(rows)).toContain(n3.id);
	}));

	it('should support filtering by created with smart value: month', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'I made this', body: 'this month', user_created_time: parseInt(time.goBackInTime(Date.now(), 0, 'month'), 10) });
		const n2 = await Note.save({ title: 'I made this', body: 'the month before', user_created_time: parseInt(time.goBackInTime(Date.now(), 1, 'month'), 10) });
		const n3 = await Note.save({ title: 'I made this', body: 'before before month', user_created_time: parseInt(time.goBackInTime(Date.now(), 2, 'month'), 10) });

		await engine.syncTables();

		rows = await engine.search('created:month-0');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n1.id);

		rows = await engine.search('created:month-1');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('created:month-2');
		expect(rows.length).toBe(3);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);
		expect(ids(rows)).toContain(n3.id);
	}));

	it('should support filtering by created with smart value: year', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'I made this', body: 'this year', user_created_time: parseInt(time.goBackInTime(Date.now(), 0, 'year'), 10) });
		const n2 = await Note.save({ title: 'I made this', body: 'the year before', user_created_time: parseInt(time.goBackInTime(Date.now(), 1, 'year'), 10) });
		const n3 = await Note.save({ title: 'I made this', body: 'before before year', user_created_time: parseInt(time.goBackInTime(Date.now(), 2, 'year'), 10) });

		await engine.syncTables();

		rows = await engine.search('created:year-0');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n1.id);

		rows = await engine.search('created:year-1');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('created:year-2');
		expect(rows.length).toBe(3);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);
		expect(ids(rows)).toContain(n3.id);
	}));

	it('should support filtering by updated date', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'I updated this on', body: 'May 20 2020', updated_time: Date.parse('2020-05-20'), user_updated_time: Date.parse('2020-05-20') }, { autoTimestamp: false });
		const n2 = await Note.save({ title: 'I updated this on', body: 'May 19 2020', updated_time: Date.parse('2020-05-19'), user_updated_time: Date.parse('2020-05-19') }, { autoTimestamp: false });

		await engine.syncTables();

		rows = await engine.search('updated:20200520');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n1.id);

		rows = await engine.search('updated:20200519');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);
	}));

	it('should support filtering by updated with smart value: day', asyncTest(async () => {
		let rows;
		const today = parseInt(time.goBackInTime(Date.now(), 0, 'day'), 10);
		const yesterday = parseInt(time.goBackInTime(Date.now(), 1, 'day'), 10);
		const dayBeforeYesterday = parseInt(time.goBackInTime(Date.now(), 2, 'day'), 10);
		const n1 = await Note.save({ title: 'I made this', body: 'today', updated_time: today, user_updated_time: today  }, { autoTimestamp: false });
		const n11 = await Note.save({ title: 'I also made this', body: 'today', updated_time: today, user_updated_time: today  }, { autoTimestamp: false });

		const n2 = await Note.save({ title: 'I made this', body: 'yesterday', updated_time: yesterday, user_updated_time: yesterday }, { autoTimestamp: false });
		const n3 = await Note.save({ title: 'I made this', body: 'day before yesterday', updated_time: dayBeforeYesterday ,user_updated_time: dayBeforeYesterday }, { autoTimestamp: false });

		await engine.syncTables();

		rows = await engine.search('updated:day-0');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n11.id);

		rows = await engine.search('updated:day-1');
		expect(rows.length).toBe(3);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n11.id);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('updated:day-2');
		expect(rows.length).toBe(4);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n11.id);
		expect(ids(rows)).toContain(n2.id);
		expect(ids(rows)).toContain(n3.id);
	}));

	it('should support filtering by type todo', asyncTest(async () => {
		let rows;
		const t1 = await Note.save({ title: 'This is a ', body: 'todo', is_todo: 1 });
		const t2 = await Note.save({ title: 'This is another', body: 'todo but completed', is_todo: 1, todo_completed: 1590085027710 });
		const t3 = await Note.save({ title: 'This is NOT a ', body: 'todo' });

		await engine.syncTables();

		rows = await engine.search('type:todo');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(t1.id);
		expect(ids(rows)).toContain(t2.id);

		rows = await engine.search('any:1 type:todo');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(t1.id);
		expect(ids(rows)).toContain(t2.id);

		rows = await engine.search('iscompleted:1');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(t2.id);

		rows = await engine.search('iscompleted:0');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(t1.id);
	}));

	it('should support filtering by type note', asyncTest(async () => {
		let rows;
		const t1 = await Note.save({ title: 'This is a ', body: 'todo', is_todo: 1 });
		const t2 = await Note.save({ title: 'This is another', body: 'todo but completed', is_todo: 1, todo_completed: 1590085027710 });
		const t3 = await Note.save({ title: 'This is NOT a ', body: 'todo' });

		await engine.syncTables();

		rows = await engine.search('type:note');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(t3.id);
	}));

	it('should support filtering by latitude, longitude, altitude', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'I made this', body: 'this week', latitude: 12.97, longitude: 88.88, altitude: 69.96  });
		const n2 = await Note.save({ title: 'I made this', body: 'the week before', latitude: 42.11, longitude: 77.77, altitude: 42.00  });
		const n3 = await Note.save({ title: 'I made this', body: 'before before week', latitude: 82.01, longitude: 66.66, altitude: 13.13  });

		await engine.syncTables();

		rows = await engine.search('latitude:13.5');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n2.id);
		expect(ids(rows)).toContain(n3.id);

		rows = await engine.search('-latitude:40');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n1.id);

		rows = await engine.search('latitude:13 -latitude:80');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('altitude:13.5');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('-altitude:80.12');
		expect(rows.length).toBe(3);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);
		expect(ids(rows)).toContain(n3.id);

		rows = await engine.search('longitude:70 -longitude:80');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('latitude:20 longitude:50 altitude:40');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('any:1 latitude:20 longitude:50 altitude:40');
		expect(rows.length).toBe(3);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);
		expect(ids(rows)).toContain(n3.id);
	}));

	it('should support filtering by resource MIME type', asyncTest(async () => {
		let rows;
		const service = new ResourceService();
		// console.log(testImagePath)
		const folder1 = await Folder.save({ title: 'folder1' });
		let n1 = await Note.save({ title: 'I have a picture', body: 'Im awesome', parent_id: folder1.id });
		const n2 = await Note.save({ title: 'Boring note 1', body: 'I just have text', parent_id: folder1.id });
		const n3 = await Note.save({ title: 'Boring note 2', body: 'me too', parent_id: folder1.id });
		let n4 = await Note.save({ title: 'A picture?', body: 'pfff, I have a pdf', parent_id: folder1.id });
		await engine.syncTables();

		// let note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		n1 = await shim.attachFileToNote(n1, `${__dirname}/../tests/support/photo.jpg`);
		// const resource1 = (await Resource.all())[0];

		n4 = await shim.attachFileToNote(n4, `${__dirname}/../tests/support/welcome.pdf`);

		await service.indexNoteResources();

		rows = await engine.search('resource:image/jpeg');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n1.id);

		rows = await engine.search('resource:image/*');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n1.id);

		rows = await engine.search('resource:application/pdf');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n4.id);

		rows = await engine.search('-resource:image/jpeg');
		expect(rows.length).toBe(3);
		expect(ids(rows)).toContain(n2.id);
		expect(ids(rows)).toContain(n3.id);
		expect(ids(rows)).toContain(n4.id);

		rows = await engine.search('any:1 resource:application/pdf resource:image/jpeg');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n4.id);
	}));

	it('should ignore dashes in a word', asyncTest(async () => {
		const n0 = await Note.save({ title: 'doesnotwork' });
		const n1 = await Note.save({ title: 'does not work' });
		const n2 = await Note.save({ title: 'does-not-work' });
		const n3 = await Note.save({ title: 'does_not_work' });

		await engine.syncTables();

		let rows = await engine.search('does-not-work');
		expect(rows.length).toBe(3);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);
		expect(ids(rows)).toContain(n3.id);

		rows = await engine.search('does not work');
		expect(rows.length).toBe(3);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);
		expect(ids(rows)).toContain(n3.id);

		rows = await engine.search('"does not work"');
		expect(rows.length).toBe(3);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);
		expect(ids(rows)).toContain(n3.id);

		rows = await engine.search('title:does-not-work');
		expect(rows.length).toBe(3);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);
		expect(ids(rows)).toContain(n3.id);

		rows = await engine.search('doesnotwork');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n0.id);

	}));

	it('should support filtering by sourceurl', asyncTest(async () => {
		const n0 = await Note.save({ title: 'n0', source_url: 'https://discourse.joplinapp.org' });
		const n1 = await Note.save({ title: 'n1', source_url: 'https://google.com' });
		const n2 = await Note.save({ title: 'n2', source_url: 'https://reddit.com' });
		const n3 = await Note.save({ title: 'n3', source_url: 'https://joplinapp.org' });

		await engine.syncTables();

		let rows = await engine.search('sourceurl:https://joplinapp.org');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n3.id);

		rows = await engine.search('sourceurl:https://google.com');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n1.id);

		rows = await engine.search('any:1 sourceurl:https://google.com sourceurl:https://reddit.com');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);

		rows = await engine.search('-sourceurl:https://google.com');
		expect(rows.length).toBe(3);
		expect(ids(rows)).toContain(n0.id);
		expect(ids(rows)).toContain(n2.id);
		expect(ids(rows)).toContain(n3.id);

		rows = await engine.search('sourceurl:*joplinapp.org');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(n0.id);
		expect(ids(rows)).toContain(n3.id);

	}));

});
