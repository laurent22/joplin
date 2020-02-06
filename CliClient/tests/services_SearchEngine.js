/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, asyncTest, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const SearchEngine = require('lib/services/SearchEngine');
const Note = require('lib/models/Note');
const ItemChange = require('lib/models/ItemChange');
const Setting = require('lib/models/Setting');

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

	it('should keep the content and FTS table in sync', asyncTest(async () => {
		let rows, n1, n2, n3;

		n1 = await Note.save({ title: 'a' });
		n2 = await Note.save({ title: 'b' });
		await engine.syncTables();
		rows = await engine.search('a');
		expect(rows.length).toBe(1);
		expect(rows[0].title).toBe('a');

		await Note.delete(n1.id);
		await engine.syncTables();
		rows = await engine.search('a');
		expect(rows.length).toBe(0);
		rows = await engine.search('b');
		expect(rows[0].title).toBe('b');

		await Note.save({ id: n2.id, title: 'c' });
		await engine.syncTables();
		rows = await engine.search('b');
		expect(rows.length).toBe(0);
		rows = await engine.search('c');
		expect(rows[0].title).toBe('c');

		await Note.save({ id: n2.id, encryption_applied: 1 });
		await engine.syncTables();
		rows = await engine.search('c');
		expect(rows.length).toBe(0);

		await Note.save({ id: n2.id, encryption_applied: 0 });
		await engine.syncTables();
		rows = await engine.search('c');
		expect(rows.length).toBe(1);
	}));

	it('should, after initial indexing, save the last change ID', asyncTest(async () => {
		const n1 = await Note.save({ title: 'abcd efgh' }); // 3
		const n2 = await Note.save({ title: 'abcd aaaaa abcd abcd' }); // 1

		expect(Setting.value('searchEngine.initialIndexingDone')).toBe(false);

		await ItemChange.waitForAllSaved();
		const lastChangeId = await ItemChange.lastChangeId();

		await engine.syncTables();

		expect(Setting.value('searchEngine.lastProcessedChangeId')).toBe(lastChangeId);
		expect(Setting.value('searchEngine.initialIndexingDone')).toBe(true);
	}));


	it('should order search results by relevance (1)', asyncTest(async () => {
		const n1 = await Note.save({ title: 'abcd efgh' }); // 3
		const n2 = await Note.save({ title: 'abcd aaaaa abcd abcd' }); // 1
		const n3 = await Note.save({ title: 'abcd aaaaa bbbb eeee abcd' }); // 2

		await engine.syncTables();
		const rows = await engine.search('abcd');

		expect(rows[0].id).toBe(n2.id);
		expect(rows[1].id).toBe(n3.id);
		expect(rows[2].id).toBe(n1.id);
	}));

	it('should order search results by relevance (2)', asyncTest(async () => {
		// 1
		const n1 = await Note.save({ title: 'abcd efgh', body: 'XX abcd XX efgh' });
		// 4
		const n2 = await Note.save({ title: 'abcd aaaaa bbbb eeee efgh' });
		// 3
		const n3 = await Note.save({ title: 'abcd aaaaa efgh' });
		// 2
		const n4 = await Note.save({ title: 'blablablabla blabla bla abcd X efgh' });
		// 5
		const n5 = await Note.save({ title: 'occurence many times but very abcd spread appart spread appart spread appart spread appart spread appart efgh occurence many times but very abcd spread appart spread appart spread appart spread appart spread appart efgh occurence many times but very abcd spread appart spread appart spread appart spread appart spread appart efgh occurence many times but very abcd spread appart spread appart spread appart spread appart spread appart efgh occurence many times but very abcd spread appart spread appart spread appart spread appart spread appart efgh' });

		await engine.syncTables();
		const rows = await engine.search('abcd efgh');

		expect(rows[0].id).toBe(n1.id);
		expect(rows[1].id).toBe(n4.id);
		expect(rows[2].id).toBe(n3.id);
		expect(rows[3].id).toBe(n2.id);
		expect(rows[4].id).toBe(n5.id);
	}));

	it('should order search results by relevance (last updated first)', asyncTest(async () => {
		let rows;

		const n1 = await Note.save({ title: 'abcd' });
		await sleep(0.1);
		const n2 = await Note.save({ title: 'abcd' });
		await sleep(0.1);
		const n3 = await Note.save({ title: 'abcd' });
		await sleep(0.1);

		await engine.syncTables();
		rows = await engine.search('abcd');

		expect(rows[0].id).toBe(n3.id);
		expect(rows[1].id).toBe(n2.id);
		expect(rows[2].id).toBe(n1.id);

		await Note.save({ id: n1.id, title: 'abcd' });

		await engine.syncTables();
		rows = await engine.search('abcd');
		expect(rows[0].id).toBe(n1.id);
		expect(rows[1].id).toBe(n3.id);
		expect(rows[2].id).toBe(n2.id);
	}));

	it('should order search results by relevance (completed to-dos last)', asyncTest(async () => {
		let rows;

		const n1 = await Note.save({ title: 'abcd', is_todo: 1 });
		await sleep(0.1);
		const n2 = await Note.save({ title: 'abcd', is_todo: 1 });
		await sleep(0.1);
		const n3 = await Note.save({ title: 'abcd', is_todo: 1 });
		await sleep(0.1);

		await engine.syncTables();
		rows = await engine.search('abcd');

		expect(rows[0].id).toBe(n3.id);
		expect(rows[1].id).toBe(n2.id);
		expect(rows[2].id).toBe(n1.id);

		await Note.save({ id: n3.id, todo_completed: Date.now() });

		await engine.syncTables();
		rows = await engine.search('abcd');
		expect(rows[0].id).toBe(n2.id);
		expect(rows[1].id).toBe(n1.id);
		expect(rows[2].id).toBe(n3.id);
	}));

	it('should supports various query types', asyncTest(async () => {
		let rows;

		const n1 = await Note.save({ title: 'abcd efgh ijkl', body: 'aaaa bbbb' });
		const n2 = await Note.save({ title: 'iiii efgh bbbb', body: 'aaaa bbbb' });
		const n3 = await Note.save({ title: 'Агентство Рейтер' });
		const n4 = await Note.save({ title: 'Dog' });
		const n5 = await Note.save({ title: 'СООБЩИЛО' });

		await engine.syncTables();

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

		rows = await engine.search('Рейтер');
		expect(rows.length).toBe(1);

		rows = await engine.search('рейтер');
		expect(rows.length).toBe(1);

		rows = await engine.search('Dog');
		expect(rows.length).toBe(1);

		rows = await engine.search('dog');
		expect(rows.length).toBe(1);

		rows = await engine.search('сообщило');
		expect(rows.length).toBe(1);
	}));

	it('should support queries with or without accents', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'père noël' });

		await engine.syncTables();

		expect((await engine.search('père')).length).toBe(1);
		expect((await engine.search('pere')).length).toBe(1);
		expect((await engine.search('noe*')).length).toBe(1);
		expect((await engine.search('noë*')).length).toBe(1);
	}));

	it('should support queries with Chinese characters', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: '我是法国人' });

		await engine.syncTables();

		expect((await engine.search('我')).length).toBe(1);
		expect((await engine.search('法国人')).length).toBe(1);
	}));

	it('should support queries with Japanese characters', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: '私は日本語を話すことができません' });

		await engine.syncTables();

		expect((await engine.search('日本')).length).toBe(1);
		expect((await engine.search('できません')).length).toBe(1);
	}));

	it('should support queries with Korean characters', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: '이것은 한국말이다' });

		await engine.syncTables();

		expect((await engine.search('이것은')).length).toBe(1);
		expect((await engine.search('말')).length).toBe(1);
	}));

	it('should support queries with Thai characters', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: 'นี่คือคนไทย' });

		await engine.syncTables();

		expect((await engine.search('นี่คือค')).length).toBe(1);
		expect((await engine.search('ไทย')).length).toBe(1);
	}));

	it('should support field restricted queries with Chinese characters', asyncTest(async () => {
		let rows;
		const n1 = await Note.save({ title: '你好', body: '我是法国人' });

		await engine.syncTables();

		expect((await engine.search('title:你好*')).length).toBe(1);
		expect((await engine.search('body:你好')).length).toBe(0);
		expect((await engine.search('title:你好 body:法国人')).length).toBe(1);
		expect((await engine.search('title:你好 body:bla')).length).toBe(0);
		expect((await engine.search('title:你好 我是')).length).toBe(1);
		expect((await engine.search('title:bla 我是')).length).toBe(0);

		// For non-alpha char, only the first field is looked at, the following ones are ignored
		expect((await engine.search('title:你好 title:hello')).length).toBe(1);
	}));

	it('should parse normal query strings', asyncTest(async () => {
		let rows;

		const testCases = [
			['abcd efgh', { _: ['abcd', 'efgh'] }],
			['abcd   efgh', { _: ['abcd', 'efgh'] }],
			['title:abcd efgh', { _: ['efgh'], title: ['abcd'] }],
			['title:abcd', { title: ['abcd'] }],
			['"abcd efgh"', { _: ['abcd efgh'] }],
			['title:abcd title:efgh', { title: ['abcd', 'efgh'] }],
		];

		for (let i = 0; i < testCases.length; i++) {
			const t = testCases[i];
			const input = t[0];
			const expected = t[1];
			const actual = engine.parseQuery(input);

			const _Values = actual.terms._ ? actual.terms._.map(v => v.value) : undefined;
			const titleValues = actual.terms.title ? actual.terms.title.map(v => v.value) : undefined;
			const bodyValues = actual.terms.body ? actual.terms.body.map(v => v.value) : undefined;

			expect(JSON.stringify(_Values)).toBe(JSON.stringify(expected._), `Test case (_) ${i}`);
			expect(JSON.stringify(titleValues)).toBe(JSON.stringify(expected.title), `Test case (title) ${i}`);
			expect(JSON.stringify(bodyValues)).toBe(JSON.stringify(expected.body), `Test case (body) ${i}`);
		}
	}));

	it('should handle queries with special characters', asyncTest(async () => {
		let rows;

		const testCases = [
			['did-not-match', 'did-not-match'],
			['does match', 'does match'],
		];

		for (let i = 0; i < testCases.length; i++) {
			const t = testCases[i];
			const content = t[0];
			const query = t[1];

			const n = await Note.save({ title: content });
			await engine.syncTables();
			rows = await engine.search(query);
			expect(rows.length).toBe(1);

			await Note.delete(n.id);
		}
	}));

});
