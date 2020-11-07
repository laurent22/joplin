/* eslint-disable no-unused-vars */
/* eslint prefer-const: 0*/

//
// const time = require('@joplin/lib/time').default;
// const { fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, asyncTest, db, synchronizer, fileApi, sleep, createNTestNotes, switchClient, createNTestFolders } = require('./test-utils.js');
// const SearchEngine = require('@joplin/lib/services/searchengine/SearchEngine');
// const Note = require('@joplin/lib/models/Note');
// const Folder = require('@joplin/lib/models/Folder');
// const Tag = require('@joplin/lib/models/Tag');
// const ItemChange = require('@joplin/lib/models/ItemChange');
// const Setting = require('@joplin/lib/models/Setting');
// const Resource = require('@joplin/lib/models/Resource.js');
// const shim = require('@joplin/lib/shim').default;
// const ResourceService = require('@joplin/lib/services/ResourceService.js');

// process.on('unhandledRejection', (reason, p) => {
// 	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
// });

// let engine = null;

// const ids = (array) => array.map(a => a.id);

// describe('services_SearchFuzzy', function() {
// 	beforeEach(async (done) => {
// 		await setupDatabaseAndSynchronizer(1);
// 		await switchClient(1);

// 		engine = new SearchEngine();
// 		engine.setDb(db());

// 		Setting.setValue('db.fuzzySearchEnabled', 1);
// 		done();
// 	});


// 	it('should return note almost matching title', asyncTest(async () => {
// 		let rows;
// 		const n1 = await Note.save({ title: 'If It Ain\'t Baroque, Don\'t Fix It' });
// 		const n2 = await Note.save({ title: 'Important note' });

// 		await engine.syncTables();
// 		rows = await engine.search('Broke', { fuzzy: false });
// 		expect(rows.length).toBe(0);

// 		rows = await engine.search('Broke', { fuzzy: true });
// 		expect(rows.length).toBe(1);
// 		expect(rows[0].id).toBe(n1.id);


// 		rows = await engine.search('title:Broke', { fuzzy: true });
// 		expect(rows.length).toBe(1);
// 		expect(rows[0].id).toBe(n1.id);

// 		rows = await engine.search('title:"Broke"', { fuzzy: true });
// 		expect(rows.length).toBe(1);
// 		expect(rows[0].id).toBe(n1.id);

// 		rows = await engine.search('Imprtant', { fuzzy: true });
// 		expect(rows.length).toBe(1);
// 		expect(rows[0].id).toBe(n2.id);
// 	}));


// 	it('should order results by min fuzziness', asyncTest(async () => {
// 		let rows;
// 		const n1 = await Note.save({ title: 'I demand you take me to him' });
// 		const n2 = await Note.save({ title: 'He demanded an answer' });
// 		const n3 = await Note.save({ title: 'Don\'t you make demands of me' });
// 		const n4 = await Note.save({ title: 'No drama for me' });
// 		const n5 = await Note.save({ title: 'Just minding my own business' });

// 		await engine.syncTables();
// 		rows = await engine.search('demand', { fuzzy: false });
// 		expect(rows.length).toBe(1);
// 		expect(rows[0].id).toBe(n1.id);


// 		rows = await engine.search('demand', { fuzzy: true });
// 		expect(rows.length).toBe(3);
// 		expect(rows[0].id).toBe(n1.id);
// 		expect(rows[1].id).toBe(n3.id);
// 		expect(rows[2].id).toBe(n2.id);
// 	}));

// 	it('should consider any:1', asyncTest(async () => {
// 		let rows;
// 		const n1 = await Note.save({ title: 'cat' });
// 		const n2 = await Note.save({ title: 'cats' });
// 		const n3 = await Note.save({ title: 'cot' });

// 		const n4 = await Note.save({ title: 'defenestrate' });
// 		const n5 = await Note.save({ title: 'defenstrate' });
// 		const n6 = await Note.save({ title: 'defenestrated' });

// 		const n7 = await Note.save({ title: 'he defenestrated the cat' });

// 		await engine.syncTables();

// 		rows = await engine.search('defenestrated cat', { fuzzy: true });
// 		expect(rows.length).toBe(1);

// 		rows = await engine.search('any:1 defenestrated cat', { fuzzy: true });
// 		expect(rows.length).toBe(7);
// 	}));

// 	it('should leave phrase searches alone', asyncTest(async () => {
// 		let rows;
// 		const n1 = await Note.save({ title: 'abc def' });
// 		const n2 = await Note.save({ title: 'def ghi' });
// 		const n3 = await Note.save({ title: 'ghi jkl' });
// 		const n4 = await Note.save({ title: 'def abc' });
// 		const n5 = await Note.save({ title: 'mno pqr ghi jkl' });

// 		await engine.syncTables();

// 		rows = await engine.search('abc def', { fuzzy: true });
// 		expect(rows.length).toBe(2);
// 		expect(rows.map(r=>r.id)).toContain(n1.id);
// 		expect(rows.map(r=>r.id)).toContain(n4.id);

// 		rows = await engine.search('"abc def"', { fuzzy: true });
// 		expect(rows.length).toBe(1);
// 		expect(rows.map(r=>r.id)).toContain(n1.id);

// 		rows = await engine.search('"ghi jkl"', { fuzzy: true });
// 		expect(rows.length).toBe(2);
// 		expect(rows.map(r=>r.id)).toContain(n3.id);
// 		expect(rows.map(r=>r.id)).toContain(n5.id);

// 		rows = await engine.search('"ghi jkl" mno', { fuzzy: true });
// 		expect(rows.length).toBe(1);
// 		expect(rows.map(r=>r.id)).toContain(n5.id);

// 		rows = await engine.search('any:1 "ghi jkl" mno', { fuzzy: true });
// 		expect(rows.length).toBe(2);
// 		expect(rows.map(r=>r.id)).toContain(n3.id);
// 		expect(rows.map(r=>r.id)).toContain(n5.id);
// 	}));

// 	it('should leave wild card searches alone', asyncTest(async () => {
// 		let rows;
// 		const n1 = await Note.save({ title: 'abc def' });
// 		const n2 = await Note.save({ title: 'abcc ghi' });
// 		const n3 = await Note.save({ title: 'abccc ghi' });
// 		const n4 = await Note.save({ title: 'abcccc ghi' });
// 		const n5 = await Note.save({ title: 'wxy zzz' });

// 		await engine.syncTables();

// 		rows = await engine.search('abc*', { fuzzy: true });

// 		expect(rows.length).toBe(4);
// 		expect(rows.map(r=>r.id)).toContain(n1.id);
// 		expect(rows.map(r=>r.id)).toContain(n2.id);
// 		expect(rows.map(r=>r.id)).toContain(n3.id);
// 		expect(rows.map(r=>r.id)).toContain(n4.id);
// 	}));

// });
