require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const SearchEngine = require('lib/services/SearchEngine');
const Note = require('lib/models/Note');

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

	it('should keep the content and FTS table in sync', async (done) => {
		let rows, n1, n2, n3;

		n1 = await Note.save({ title: "a" });
		n2 = await Note.save({ title: "b" });
		rows = await engine.search('a');
		expect(rows.length).toBe(1);
		expect(rows[0].title).toBe('a');

		await Note.delete(n1.id);
		rows = await engine.search('a');
		expect(rows.length).toBe(0);
		rows = await engine.search('b');
		expect(rows[0].title).toBe('b');

		await Note.save({ id: n2.id, title: 'c' });
		rows = await engine.search('b');
		expect(rows.length).toBe(0);
		rows = await engine.search('c');
		expect(rows[0].title).toBe('c');

		await Note.save({ id: n2.id, encryption_applied: 1 });
		rows = await engine.search('c');
		expect(rows.length).toBe(0);

		await Note.save({ id: n2.id, encryption_applied: 0 });
		rows = await engine.search('c');
		expect(rows.length).toBe(1);

		done();
	});

	it('should order search results by relevance (1)', async (done) => {
		const n1 = await Note.save({ title: "abcd efgh" }); // 3
		const n2 = await Note.save({ title: "abcd aaaaa abcd abcd" }); // 1
		const n3 = await Note.save({ title: "abcd aaaaa bbbb eeee abcd" }); // 2

		const rows = await engine.search('abcd');

		expect(rows[0].id).toBe(n2.id);
		expect(rows[1].id).toBe(n3.id);
		expect(rows[2].id).toBe(n1.id);

		done();
	});

	it('should order search results by relevance (2)', async (done) => {
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

	it('should parse normal query strings', async (done) => {
		let rows;

		const testCases = [
			['abcd efgh', { _: ['abcd', 'efgh'] }],
			['abcd   efgh', { _: ['abcd', 'efgh'] }],
			['title:abcd efgh', { _: ['efgh'], title: ['abcd'] }],
			['title:abcd', { title: ['abcd'] }],
			['"abcd efgh"', { _: ['abcd efgh'] }],
		];

		for (let i = 0; i < testCases.length; i++) {
			const t = testCases[i];
			const input = t[0];
			const expected = t[1];
			const actual = engine.parseQuery(input);

			expect(JSON.stringify(actual.terms._)).toBe(JSON.stringify(expected._));
			expect(JSON.stringify(actual.terms.title)).toBe(JSON.stringify(expected.title));
			expect(JSON.stringify(actual.terms.body)).toBe(JSON.stringify(expected.body));
		}

		done();
	});

	it('should parse query strings with wildcards', async (done) => {
		let rows;

		const testCases = [
			['do*', ['do', 'dog', 'domino'] ],
			['*an*', ['an', 'piano', 'anneau', 'plan', 'PANIC'] ],
		];

		for (let i = 0; i < testCases.length; i++) {
			const t = testCases[i];
			const input = t[0];
			const expected = t[1];
			const regex = engine.parseQuery(input).terms._[0];

			for (let j = 0; j < expected.length; j++) {
				const r = expected[j].match(regex);
				expect(!!r).toBe(true);
			}
		}

		expect(engine.parseQuery('*').termCount).toBe(0);

		done();
	});

});