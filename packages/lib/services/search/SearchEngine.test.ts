import { setupDatabaseAndSynchronizer, db, sleep, switchClient, msleep } from '../../testing/test-utils';
import SearchEngine from './SearchEngine';
import Note from '../../models/Note';
import ItemChange from '../../models/ItemChange';
import Setting from '../../models/Setting';

let engine: SearchEngine = null;

// const IDF = (N:number, n:number) => Math.max(Math.log((N - n + 0.5) / (n + 0.5)), 0);

// const frequency = (word:string, string:string) => {
// 	const re = new RegExp(`\\b(${word})\\b`, 'g');
// 	return (string.match(re) || []).length;
// };

// const calculateScore = (searchString, notes) => {
// 	const K1 = 1.2;
// 	const B = 0.75;

// 	const freqTitle = notes.map(note => frequency(searchString, note.title));
// 	const notesWithWord = freqTitle.filter(count => count !== 0).length;
// 	const numTokens = notes.map(note => note.title.split(' ').length);
// 	const avgTokens = Math.round(numTokens.reduce((a, b) => a + b, 0) / notes.length);

// 	const msSinceEpoch = Math.round(new Date().getTime());
// 	const msPerDay = 86400000;
// 	const weightForDaysSinceLastUpdate = (row) => {
// 		// BM25 weights typically range 0-10, and last updated date should weight similarly, though prioritizing recency logarithmically.
// 		// An alpha of 200 ensures matches in the last week will show up front (11.59) and often so for matches within 2 weeks (5.99),
// 		// but is much less of a factor at 30 days (2.84) or very little after 90 days (0.95), focusing mostly on content at that point.
// 		if (!row.user_updated_time) {
// 			return 0;
// 		}

// 		const alpha = 200;
// 		const daysSinceLastUpdate = (msSinceEpoch - row.user_updated_time) / msPerDay;
// 		return alpha * Math.log(1 + 1 / Math.max(daysSinceLastUpdate, 0.5));
// 	};

// 	let titleBM25WeightedByLastUpdate = new Array(notes.length).fill(-1);
// 	if (avgTokens !== 0) {
// 		for (let i = 0; i < notes.length; i++) {
// 			titleBM25WeightedByLastUpdate[i] = IDF(notes.length, notesWithWord) * ((freqTitle[i] * (K1 + 1)) / (freqTitle[i] + K1 * (1 - B + B * (numTokens[i] / avgTokens))));
// 			titleBM25WeightedByLastUpdate[i] += weightForDaysSinceLastUpdate(notes[i]);
// 		}
// 	}

// 	const scores = [];
// 	for (let i = 0; i < notes.length; i++) {
// 		if (freqTitle[i]) scores.push(titleBM25WeightedByLastUpdate[i]);
// 	}

// 	scores.sort().reverse();
// 	return scores;
// };

describe('services/SearchEngine', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);

		engine = new SearchEngine();
		engine.setDb(db());
	});

	it('should keep the content and FTS table in sync', (async () => {
		let rows;

		const n1 = await Note.save({ title: 'a' });
		const n2 = await Note.save({ title: 'b' });
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

	it('should, after initial indexing, save the last change ID', (async () => {
		await Note.save({ title: 'abcd efgh' }); // 3
		await Note.save({ title: 'abcd aaaaa abcd abcd' }); // 1

		expect(Setting.value('searchEngine.initialIndexingDone')).toBe(false);

		await ItemChange.waitForAllSaved();
		const lastChangeId = await ItemChange.lastChangeId();

		await engine.syncTables();

		expect(Setting.value('searchEngine.lastProcessedChangeId')).toBe(lastChangeId);
		expect(Setting.value('searchEngine.initialIndexingDone')).toBe(true);
	}));


	it('should order search results by relevance BM25', (async () => {
		// BM25 is based on term frequency - inverse document frequency
		// The tf–idf value increases proportionally to the number of times a word appears in the document
		// and is offset by the number of documents in the corpus that contain the word, which helps to adjust
		// for the fact that some words appear more frequently in general.

		// BM25 returns weight zero for search term which occurs in more than half the notes.
		// So terms that are abundant in all notes to have zero relevance w.r.t BM25.

		const n1 = await Note.save({ title: 'abcd efgh' }); // 3
		const n2 = await Note.save({ title: 'abcd efgh abcd abcd' }); // 1
		const n3 = await Note.save({ title: 'abcd aaaaa bbbb eeee abcd' }); // 2
		await Note.save({ title: 'xyz xyz' });
		await Note.save({ title: 'xyz xyz xyz xyz' });
		await Note.save({ title: 'xyz xyz xyz xyz xyz xyz' });
		await Note.save({ title: 'xyz xyz xyz xyz xyz xyz' });
		await Note.save({ title: 'xyz xyz xyz xyz xyz xyz xyz xyz' });

		await engine.syncTables();
		let rows = await engine.search('abcd');

		expect(rows[0].id).toBe(n2.id);
		expect(rows[1].id).toBe(n3.id);
		expect(rows[2].id).toBe(n1.id);

		rows = await engine.search('abcd efgh');
		expect(rows[0].id).toBe(n1.id); // shorter note; also 'efgh' is more rare than 'abcd'.
		expect(rows[1].id).toBe(n2.id);
	}));

	it('should order search results by relevance BM25 - 2', async () => {
		// This simple test case didn't even work before due to a bug in the IDF
		// calculation, and would just order by timestamp.
		const n1 = await Note.save({ title: 'abcd abcd' }); // 1
		await msleep(1);
		const n2 = await Note.save({ title: 'abcd' }); // 2

		await engine.syncTables();

		const rows = await engine.search('abcd');

		expect(rows[0].id).toBe(n1.id);
		expect(rows[1].id).toBe(n2.id);
	});

	// TODO: Need to update and replace jasmine.mockDate() calls with Jest
	// equivalent

	// it('should correctly weigh notes using BM25 and user_updated_time', (async () => {
	// 	await mockDate(2020, 9, 30, 50);
	// 	const noteData = [
	// 		{
	// 			title: 'abc test2 test2',
	// 			updated_time: 1601425064756,
	// 			user_updated_time: 1601425064756,
	// 			created_time: 1601425064756,
	// 			user_created_time: 1601425064756,
	// 		},
	// 		{
	// 			title: 'foo foo',
	// 			updated_time: 1601425064758,
	// 			user_updated_time: 1601425064758,
	// 			created_time: 1601425064758,
	// 			user_created_time: 1601425064758,
	// 		},
	// 		{
	// 			title: 'dead beef',
	// 			updated_time: 1601425064760,
	// 			user_updated_time: 1601425064760,
	// 			created_time: 1601425064760,
	// 			user_created_time: 1601425064760,
	// 		},
	// 		{
	// 			title: 'test2 bar',
	// 			updated_time: 1601425064761,
	// 			user_updated_time: 1601425064761,
	// 			created_time: 1601425064761,
	// 			user_created_time: 1601425064761,
	// 		},
	// 		{
	// 			title: 'blah blah abc',
	// 			updated_time: 1601425064763,
	// 			user_updated_time: 1601425064763,
	// 			created_time: 1601425064763,
	// 			user_created_time: 1601425064763,
	// 		},
	// 	];

	// 	const n0 = await Note.save(noteData[0], { autoTimestamp: false });
	// 	const n1 = await Note.save(noteData[1], { autoTimestamp: false });
	// 	const n2 = await Note.save(noteData[2], { autoTimestamp: false });
	// 	const n3 = await Note.save(noteData[3], { autoTimestamp: false });
	// 	const n4 = await Note.save(noteData[4], { autoTimestamp: false });
	// 	restoreDate();
	// 	await engine.syncTables();
	// 	await mockDate(2020, 9, 30, 50);

	// 	let searchString = 'abc';
	// 	let scores = calculateScore(searchString, noteData);
	// 	let rows = await engine.search(searchString);

	// 	expect(rows[0].weight).toEqual(scores[0]);
	// 	expect(rows[1].weight).toEqual(scores[1]);

	// 	// console.log(rows);
	// 	// console.log(scores);

	// 	searchString = 'test2';
	// 	scores = calculateScore(searchString, noteData);
	// 	rows = await engine.search(searchString);

	// 	// console.log(rows);
	// 	// console.log(scores);

	// 	expect(rows[0].weight).toEqual(scores[0]);
	// 	expect(rows[1].weight).toEqual(scores[1]);

	// 	searchString = 'foo';
	// 	scores = calculateScore(searchString, noteData);
	// 	rows = await engine.search(searchString);

	// 	// console.log(rows);
	// 	// console.log(scores);

	// 	expect(rows[0].weight).toEqual(scores[0]);
	// 	await restoreDate();
	// }));

	it('should tell where the results are found', (async () => {
		const notes = [
			await Note.save({ title: 'abcd efgh', body: 'abcd' }),
			await Note.save({ title: 'abcd' }),
			await Note.save({ title: 'efgh', body: 'abcd' }),
		];

		await engine.syncTables();

		const testCases: [string, string[], string[], string[]][] = [
			['abcd', ['title', 'body'], ['title'], ['body']],
			['efgh', ['title'], [], ['title']],
		];

		for (const testCase of testCases) {
			const rows = await engine.search(testCase[0]);

			for (let i = 0; i < notes.length; i++) {
				const row = rows.find(row => row.id === notes[i].id);
				const actual = row ? row.fields.sort().join(',') : '';
				const expected = (testCase[i + 1] as string[]).sort().join(',');
				expect(expected).toBe(actual);
			}
		}
	}));

	it('should order search results by relevance (last updated first)', (async () => {
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

	it('should order search results by relevance (completed to-dos last)', (async () => {
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

	it('should support searching through documents that contain null characters', (async () => {
		await Note.save({
			title: 'Test',
			body: `
				NUL characters, "\x00", have been known to break FTS search.
				Previously, all characters after a NUL (\x00) character in a note
				would not show up in search results. NUL characters may have also
				broken search for other notes.

				In this note, "testing" only appears after the NUL characters.
			`,
		});

		await engine.syncTables();

		expect((await engine.search('previously')).length).toBe(1);
		expect((await engine.search('testing')).length).toBe(1);
	}));

	it('should use nonbreaking spaces as separators', (async () => {
		await Note.save({
			title: 'Test',
			body: 'This is\u00A0a\u00A0test\r\nof different\r\nspace separators.',
		});

		await engine.syncTables();

		expect((await engine.search('test')).length).toBe(1);
		expect((await engine.search('different')).length).toBe(1);
		expect((await engine.search('space')).length).toBe(1);
		expect((await engine.search('separators')).length).toBe(1);
	}));

	it('should supports various query types', (async () => {
		let rows;

		await Note.save({ title: 'abcd efgh ijkl', body: 'aaaa bbbb' });
		await Note.save({ title: 'iiii efgh bbbb', body: 'aaaa bbbb' });
		await Note.save({ title: 'Агентство Рейтер' });
		await Note.save({ title: 'Dog' });
		await Note.save({ title: 'СООБЩИЛО' });

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

	it('should support queries with or without accents', (async () => {
		await Note.save({ title: 'père noël' });

		await engine.syncTables();

		expect((await engine.search('père')).length).toBe(1);
		expect((await engine.search('pere')).length).toBe(1);
		expect((await engine.search('noe*')).length).toBe(1);
		expect((await engine.search('noë*')).length).toBe(1);
	}));

	it('should support queries with Chinese characters', (async () => {
		await Note.save({ title: '我是法国人', body: '中文测试' });

		await engine.syncTables();

		expect((await engine.search('我')).length).toBe(1);
		expect((await engine.search('法国人')).length).toBe(1);
		expect((await engine.search('法国人*'))[0].fields.sort()).toEqual(['body', 'title']); // usually assume that keyword was matched in body
		expect((await engine.search('测试')).length).toBe(1);
		expect((await engine.search('测试'))[0].fields).toEqual(['body']);
		expect((await engine.search('测试*'))[0].fields).toEqual(['body']);
		expect((await engine.search('any:1 type:todo 测试')).length).toBe(1);
	}));

	it('should support queries with Japanese characters', (async () => {
		await Note.save({ title: '私は日本語を話すことができません', body: 'テスト' });

		await engine.syncTables();

		expect((await engine.search('日本')).length).toBe(1);
		expect((await engine.search('できません')).length).toBe(1);
		expect((await engine.search('できません*'))[0].fields.sort()).toEqual(['body', 'title']); // usually assume that keyword was matched in body
		expect((await engine.search('テスト'))[0].fields.sort()).toEqual(['body']);
		expect((await engine.search('any:1 type:todo テスト')).length).toBe(1);
	}));

	it('should support queries with Korean characters', (async () => {
		await Note.save({ title: '이것은 한국말이다' });

		await engine.syncTables();

		expect((await engine.search('이것은')).length).toBe(1);
		expect((await engine.search('말')).length).toBe(1);
		expect((await engine.search('any:1 type:todo 말')).length).toBe(1);
	}));

	it('should support queries with Thai characters', (async () => {
		await Note.save({ title: 'นี่คือคนไทย' });

		await engine.syncTables();

		expect((await engine.search('นี่คือค')).length).toBe(1);
		expect((await engine.search('ไทย')).length).toBe(1);
		expect((await engine.search('any:1 type:todo ไทย')).length).toBe(1);
	}));

	it('should parse normal query strings', (async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const testCases: [string, any][] = [
			['abcd efgh', { _: ['abcd', 'efgh'] }],
			['abcd   efgh', { _: ['abcd', 'efgh'] }],
			['title:abcd efgh', { _: ['efgh'], title: ['abcd'] }],
			['title:abcd', { title: ['abcd'] }],
			['"abcd efgh"', { _: ['abcd efgh'] }],
			['"abcd efgh" ijkl', { _: ['abcd efgh', 'ijkl'] }],
			['title:abcd title:efgh', { title: ['abcd', 'efgh'] }],
		];

		for (let i = 0; i < testCases.length; i++) {
			const t = testCases[i];
			const input = t[0];
			const expected = t[1];
			const actual = await engine.parseQuery(input);

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const _Values = actual.terms._ ? actual.terms._.map((v: any) => v.value) : undefined;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const titleValues = actual.terms.title ? actual.terms.title.map((v: any) => v.value) : undefined;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const bodyValues = actual.terms.body ? actual.terms.body.map((v: any) => v.value) : undefined;

			expect(JSON.stringify(_Values)).toBe(JSON.stringify(expected._));
			expect(JSON.stringify(titleValues)).toBe(JSON.stringify(expected.title));
			expect(JSON.stringify(bodyValues)).toBe(JSON.stringify(expected.body));
		}
	}));

	it('should handle queries with special characters', (async () => {
		let rows;

		const testCases = [
			// "-" is considered a word delimiter so it is stripped off
			// when indexing the notes. "did-not-match" is translated to
			// three word "did", "not", "match"
			['did-not-match', 'did not match'],
			['did-not-match', '"did-not-match"'],
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

	it('should allow using basic search', (async () => {
		await Note.save({ title: '- [ ] abcd' });
		await Note.save({ title: '[ ] abcd' });

		await engine.syncTables();

		expect((await engine.search('"- [ ]"', { searchType: SearchEngine.SEARCH_TYPE_FTS })).length).toBe(0);
		expect((await engine.search('"- [ ]"', { searchType: SearchEngine.SEARCH_TYPE_BASIC })).length).toBe(1);
		expect((await engine.search('"[ ]"', { searchType: SearchEngine.SEARCH_TYPE_BASIC })).length).toBe(2);
	}));

	it('should not mistake cyrillic "l" for latin "n"', (async () => {
		const n1 = await Note.save({ title: 'latin n', body: 'n' });
		const n2 = await Note.save({ title: 'cyrillic l', body: 'л' });

		await engine.syncTables();

		expect((await engine.search('n')).length).toBe(1);
		expect((await engine.search('n'))[0].id).toBe(n1.id);

		expect((await engine.search('л')).length).toBe(1);
		expect((await engine.search('л'))[0].id).toBe(n2.id);
	}));

	it('should automatically add wildcards', (async () => {
		await Note.save({ title: 'hello1' });
		await Note.save({ title: 'hello2' });

		await engine.syncTables();

		expect((await engine.search('hello')).length).toBe(0);
		expect((await engine.search('hello', { appendWildCards: true })).length).toBe(2);
	}));

	it('should search HTML-entity encoded text', (async () => {
		await Note.save({ title: '&#xE9;&#xE7;&#xE0;' }); // éçà

		await engine.syncTables();

		const rows = await engine.search('éçà');
		expect(rows.length).toBe(1);
	}));

	// Disabled for now:
	// https://github.com/laurent22/joplin/issues/9769#issuecomment-1912459744

	// it('should search by item ID if no other result was found', (async () => {
	// 	const f1 = await Folder.save({});
	// 	const n1 = await Note.save({ title: 'hello1', parent_id: f1.id });
	// 	const n2 = await Note.save({ title: 'hello2' });

	// 	await engine.syncTables();

	// 	const results = await engine.search(n1.id);
	// 	expect(results.length).toBe(1);
	// 	expect(results[0].id).toBe(n1.id);
	// 	expect(results[0].title).toBe(n1.title);
	// 	expect(results[0].parent_id).toBe(n1.parent_id);

	// 	expect((await engine.search(n2.id))[0].id).toBe(n2.id);
	// 	expect(await engine.search(f1.id)).toEqual([]);
	// }));

});
