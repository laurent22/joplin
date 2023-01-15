/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars, prefer-const */

import { setupDatabaseAndSynchronizer, db, sleep, switchClient } from '../../testing/test-utils';
import SearchEngine from '../../services/searchengine/SearchEngine';
import Note from '../../models/Note';
import ItemChange from '../../models/ItemChange';
import Setting from '../../models/Setting';

let engine: any = null;


// const IDF = (N, n) => Math.max(Math.log((N - n + 0.5) / (n + 0.5)), 0);
//
// const frequency = (word, string) => {
// 	const re = new RegExp(`\\b(${word})\\b`, 'g');
// 	return (string.match(re) || []).length;
// };
//
// const calculateScore = (searchString, notes) => {
// 	const K1 = 1.2;
// 	const B = 0.75;
//
// 	const freqTitle = notes.map(note => frequency(searchString, note.title));
// 	const notesWithWord = freqTitle.filter(count => count !== 0).length;
// 	const numTokens = notes.map(note => note.title.split(' ').length);
// 	const avgTokens = Math.round(numTokens.reduce((a, b) => a + b, 0) / notes.length);
//
// 	const msSinceEpoch = Math.round(new Date().getTime());
// 	const msPerDay = 86400000;
// 	const weightForDaysSinceLastUpdate = (row) => {
// 		// BM25 weights typically range 0-10, and last updated date should weight similarly, though prioritizing recency logarithmically.
// 		// An alpha of 200 ensures matches in the last week will show up front (11.59) and often so for matches within 2 weeks (5.99),
// 		// but is much less of a factor at 30 days (2.84) or very little after 90 days (0.95), focusing mostly on content at that point.
// 		if (!row.user_updated_time) {
// 			return 0;
// 		}
//
// 		const alpha = 200;
// 		const daysSinceLastUpdate = (msSinceEpoch - row.user_updated_time) / msPerDay;
// 		return alpha * Math.log(1 + 1 / Math.max(daysSinceLastUpdate, 0.5));
// 	};
//
// 	let titleBM25WeightedByLastUpdate = new Array(notes.length).fill(-1);
// 	if (avgTokens !== 0) {
// 		for (let i = 0; i < notes.length; i++) {
// 			titleBM25WeightedByLastUpdate[i] = IDF(notes.length, notesWithWord) * ((freqTitle[i] * (K1 + 1)) / (freqTitle[i] + K1 * (1 - B + B * (numTokens[i] / avgTokens))));
// 			titleBM25WeightedByLastUpdate[i] += weightForDaysSinceLastUpdate(notes[i]);
// 		}
// 	}
//
// 	const scores = [];
// 	for (let i = 0; i < notes.length; i++) {
// 		if (freqTitle[i]) scores.push(titleBM25WeightedByLastUpdate[i]);
// 	}
//
// 	scores.sort().reverse();
// 	return scores;
// };

describe('services_SearchEngine', function() {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);

		engine = new SearchEngine();
		engine.setDb(db());
	});

	it('should keep the content and FTS table in sync', (async () => {
		let rows, n1, n2;

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

		Setting.setValue('search.sortOrder.field', 'bm25');
		Setting.setValue('search.sortOrder.reverse', false);
		await engine.syncTables();
		let rows = await engine.search('abcd');

		expect(rows[0].id).toBe(n2.id);
		expect(rows[1].id).toBe(n3.id);
		expect(rows[2].id).toBe(n1.id);

		rows = await engine.search('abcd efgh');
		expect(rows[0].id).toBe(n1.id); // shorter note; also 'efgh' is more rare than 'abcd'.
		expect(rows[1].id).toBe(n2.id);
	}));

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

		const testCases = [
			{ search: 'abcd', matchingPos: [['title', 'body'], ['title'], ['body']] },
			{ search: 'efgh', matchingPos: [['title'], [], ['title']] },
		];

		Setting.setValue('search.sortOrder.field', 'bm25');
		Setting.setValue('search.sortOrder.reverse', false);
		for (const testCase of testCases) {
			const rows: any[] = await engine.search(testCase.search);

			for (let i = 0; i < notes.length; i++) {
				const row = rows.find(row => row.id === notes[i].id);
				const actual = row ? row.fields.sort().join(',') : '';
				const expected = testCase.matchingPos[i].sort().join(',');
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

		Setting.setValue('search.sortOrder.field', 'bm25');
		Setting.setValue('search.sortOrder.reverse', false);
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

		Setting.setValue('search.sortOrder.field', 'bm25');
		Setting.setValue('search.sortOrder.reverse', false);
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
		const testCases = [
			{ input: 'abcd efgh', expected: { value: ['abcd', 'efgh'] } },
			{ input: 'abcd   efgh', expected: { value: ['abcd', 'efgh'] } },
			{ input: 'title:abcd efgh', expected: { value: ['efgh'], title: ['abcd'] } },
			{ input: 'title:abcd', expected: { title: ['abcd'] } },
			{ input: '"abcd efgh"', expected: { value: ['abcd efgh'] } },
			{ input: 'title:abcd title:efgh', expected: { title: ['abcd', 'efgh'] } },
			{ input: 'abcd body:efgh', expected: { value: ['abcd'], body: ['efgh'] } },
		];

		for (let i = 0; i < testCases.length; i++) {
			const testCase = testCases[i];
			const input = testCase.input;
			const expected = testCase.expected;
			const actual = await engine.parseQuery(input);
			const _Values = actual.terms._ ? actual.terms._.map((v: any) => v.value) : undefined;
			const titleValues = actual.terms.title ? actual.terms.title.map((v: any) => v.value) : undefined;
			const bodyValues = actual.terms.body ? actual.terms.body.map((v: any) => v.value) : undefined;
			expect(JSON.stringify(_Values)).toBe(JSON.stringify(expected.value));
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

	it('Order search results', (async () => {
		const note1 = await Note.save({ title: 'Testnote 2', body: 'body1', created_time: Date.parse('2021-04-01'), updated_time: Date.parse('2021-04-02') });
		const note2 = await Note.save({ title: 'testnote 11', body: 'body2', created_time: Date.parse('2021-04-03'), updated_time: Date.parse('2021-04-03') });
		const note3 = await Note.save({ title: 'Testnote 8', body: 'body3', created_time: Date.parse('2021-04-02'), updated_time: Date.parse('2021-04-05') });
		const note4 = await Note.save({ title: 'Some Testnote', body: 'body4', created_time: Date.parse('2021-04-05'), updated_time: Date.parse('2021-04-08') });
		const note5 = await Note.save({ title: '10 Testnote 5', body: 'body5', created_time: Date.parse('2021-04-10'), updated_time: Date.parse('2021-04-22') });
		const note6 = await Note.save({ title: '8 Testnote 6', body: 'body6', created_time: Date.parse('2021-04-17'), updated_time: Date.parse('2021-04-26') });
		const todo1 = await Note.save({ title: 'Testnote as todo1', body: 'todobody 1', is_todo: 1, created_time: Date.parse('2021-04-09'), updated_time: Date.parse('2021-04-24') });
		const todo2 = await Note.save({ title: '80 Testnote as todo2', body: 'todobody 2', is_todo: 1, todo_completed: Date.parse('2021-04-11'), todo_due: Date.parse('2021-04-27'), created_time: Date.parse('2021-04-14'), updated_time: Date.parse('2021-04-11') });
		const body1 = await Note.save({ title: '77 Only in body', body: 'Testnote in body', created_time: Date.parse('2021-04-28'), updated_time: Date.parse('2021-04-30') });
		await Note.save({ title: 'No match', body: 'No match', created_time: Date.parse('2021-04-28'), updated_time: Date.parse('2021-04-30') });
		await engine.syncTables();

		const testCases = [
			{ searchQuery: 'Testnote', sortOrder: { field: 'bm25', reverse: false }, expectedOrder: [todo1, note6, note5, note4, note3, note2, note1, todo2, body1] },
			{ searchQuery: 'Testnote', sortOrder: { field: 'bm25', reverse: true }, expectedOrder: [body1, todo2, note1, note2, note3, note4, note5, note6, todo1] },
			{ searchQuery: 'Testnote', sortOrder: { field: 'title', reverse: false }, expectedOrder: [note6, note5, body1, todo2, note4, note1, note3, note2, todo1] },
			{ searchQuery: 'Testnote', sortOrder: { field: 'title', reverse: true }, expectedOrder: [todo1, note2, note3, note1, note4, todo2, body1, note5, note6] },
			{ searchQuery: 'Testnote', sortOrder: { field: 'user_created_time', reverse: false }, expectedOrder: [body1, note6, todo2, note5, todo1, note4, note2, note3, note1] },
			{ searchQuery: 'Testnote', sortOrder: { field: 'user_created_time', reverse: true }, expectedOrder: [note1, note3, note2, note4, todo1, note5, todo2, note6, body1] },
			{ searchQuery: 'Testnote', sortOrder: { field: 'user_updated_time', reverse: false }, expectedOrder: [body1, todo2, todo1, note6, note5, note4, note3, note2, note1] },
			{ searchQuery: 'Testnote', sortOrder: { field: 'user_updated_time', reverse: true }, expectedOrder: [note1, note2, note3, note4, note5, note6, todo1, todo2, body1] },
		];

		for (const testCase of testCases) {
			Setting.setValue('search.sortOrder.field', testCase.sortOrder.field);
			Setting.setValue('search.sortOrder.reverse', testCase.sortOrder.reverse);
			const searchResult = await engine.search(testCase.searchQuery);
			const noteOrder = searchResult.map((v: any) => v.id);
			const expected = testCase.expectedOrder.map((v: any) => v.id);
			expect(noteOrder).toEqual(expected);
		}
	}));
});
