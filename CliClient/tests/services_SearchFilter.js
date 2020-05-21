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
		const n1 = await Note.save({ title: 'Peace Talks', body: 'Battle Ground' });
		const n2 = await Note.save({ title: 'Mouse', body: 'Mister' });
		const n3 = await Note.save({ title: 'Dresden Files', body: 'Harry Dresden' });

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

		rows = await engine.search('tag:tag1 OR tag:tag2 OR tag:tag3');
		expect(rows.length).toBe(3);
		expect(ids(rows)).toContain(n1.id);
		expect(ids(rows)).toContain(n2.id);
		expect(ids(rows)).toContain(n3.id);

		rows = await engine.search('tag:tag2 tag:tag3 tag:tag4');
		expect(rows.length).toBe(0);

		rows = await engine.search('-tag:tag2');
		expect(rows.length).toBe(1);
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

	it('should support filtering by negated notebook', asyncTest(async () => {
		let rows;
		const folder0 = await Folder.save({ title: 'notebook0' });
		const folder00 = await Folder.save({ title: 'notebook00', parent_id: folder0.id });
		const folder1 = await Folder.save({ title: 'notebook1' });
		const notes0 = await createNTestNotes(5, folder0);
		const notes00 = await createNTestNotes(5, folder00);
		const notes1 = await createNTestNotes(5, folder1);

		await engine.syncTables();

		rows = await engine.search('-notebook:notebook0');
		expect(rows.length).toBe(5);
		expect(ids(rows).sort()).toEqual(ids(notes1).sort());
	}));

	it('should support filtering by created date', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'I made this on', body: 'May 20 2020', user_created_time: Date.parse('2020-05-20') });
		const n2 = await Note.save({ title: 'I made this on', body: 'May 19 2020', user_created_time: Date.parse('2020-05-19') });

		await engine.syncTables();

		rows = await engine.search('created:20200520');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n1.id);

		rows = await engine.search('created:20200519');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n2.id);
	}));

	it('should support filtering by created with smart value: day', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'I made this', body: 'today', user_created_time: parseInt(time.goBackInTime(0, 'day')) });
		const n2 = await Note.save({ title: 'I made this', body: 'yesterday', user_created_time: parseInt(time.goBackInTime(1, 'day')) });
		const n3 = await Note.save({ title: 'I made this', body: 'day before yesterday', user_created_time: parseInt(time.goBackInTime(2, 'day')) });

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
		const n1 = await Note.save({ title: 'I made this', body: 'this week', user_created_time: parseInt(time.goBackInTime(0, 'week')) });
		const n2 = await Note.save({ title: 'I made this', body: 'the week before', user_created_time: parseInt(time.goBackInTime(1, 'week')) });
		const n3 = await Note.save({ title: 'I made this', body: 'before before week', user_created_time: parseInt(time.goBackInTime(2, 'week')) });

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
		const n1 = await Note.save({ title: 'I made this', body: 'this month', user_created_time: parseInt(time.goBackInTime(0, 'month')) });
		const n2 = await Note.save({ title: 'I made this', body: 'the month before', user_created_time: parseInt(time.goBackInTime(1, 'month')) });
		const n3 = await Note.save({ title: 'I made this', body: 'before before month', user_created_time: parseInt(time.goBackInTime(2, 'month')) });

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
		const n1 = await Note.save({ title: 'I made this', body: 'this year', user_created_time: parseInt(time.goBackInTime(0, 'year')) });
		const n2 = await Note.save({ title: 'I made this', body: 'the year before', user_created_time: parseInt(time.goBackInTime(1, 'year')) });
		const n3 = await Note.save({ title: 'I made this', body: 'before before year', user_created_time: parseInt(time.goBackInTime(2, 'year')) });

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
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(n2.id);
	}));

	it('should support filtering by updated with smart value: day', asyncTest(async () => {
		let rows;
		const today = parseInt(time.goBackInTime(0, 'day'));
		const yesterday = parseInt(time.goBackInTime(1, 'day'));
		const dayBeforeYesterday = parseInt(time.goBackInTime(2, 'day'));
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

	it('should support filtering by todo', asyncTest(async () => {
		let rows;
		const t1 = await Note.save({ title: 'This is a ', body: 'todo', is_todo: 1 });
		const t2 = await Note.save({ title: 'This is another', body: 'todo but completed', is_todo: 1, todo_completed: 1590085027710 });

		await engine.syncTables();

		rows = await engine.search('todo:*');
		expect(rows.length).toBe(2);
		expect(ids(rows)).toContain(t1.id);
		expect(ids(rows)).toContain(t2.id);

		rows = await engine.search('todo:true');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(t2.id);

		rows = await engine.search('todo:false');
		expect(rows.length).toBe(1);
		expect(ids(rows)).toContain(t1.id);
	}));

});
