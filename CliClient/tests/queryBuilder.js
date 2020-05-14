/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);
const queryBuilder = require('lib/services/queryBuilder.js');

const defaultSQL = `SELECT
	notes_fts.id,
	notes_fts.title AS normalized_title,
	offsets(notes_fts) AS offsets,
	notes.title,
	notes.user_updated_time,
	notes.is_todo,
	notes.todo_completed,
	notes.parent_id
	FROM notes_fts
	LEFT JOIN notes ON notes_fts.id = notes.id
	WHERE notes_fts MATCH (?)`;

describe('queryBuilder should give correct sql', () => {
	it('when filter is just the title', () => {
		const testTitle = 'someTitle';
		const filters = new Map([
			['title', [{ relation: 'AND', value: testTitle }]],
		]);

		expect(queryBuilder(filters)).toEqual({
			query: defaultSQL,
			params: [`title:${testTitle}`],
		});
	});

	it('when filter contains only body', () => {
		const testBody = 'someBody';
		const filters = new Map([['body', [{ relation: 'AND', value: testBody }]]]);

		expect(queryBuilder(filters)).toEqual({
			query: defaultSQL,
			params: [`body:${testBody}`],
		});
	});

	it('when filter contains both title and body', () => {
		const testTitle = 'someTitle';
		const testBody = 'someBody';
		const filters = new Map([
			['body', [{ relation: 'AND', value: testBody }]],
			['title', [{ relation: 'AND', value: testTitle }]],
		]);

		expect(queryBuilder(filters)).toEqual({
			query: defaultSQL,
			params: [`title:${testTitle} body:${testBody}`],
		});
	});

	it('when filter contains both mulitple words in title', () => {
		const testTitle = 'word1 word2'.split(' ');
		const testBody = 'someBody';
		const filters = new Map([
			['body', [{ relation: 'AND', value: testBody }]],
			[
				'title',
				[
					{ relation: 'AND', value: testTitle[0] },
					{ relation: 'AND', value: testTitle[1] },
				],
			],
		]);

		expect(queryBuilder(filters)).toEqual({
			query: defaultSQL,
			params: [`title:${testTitle[0]} title:${testTitle[1]} body:${testBody}`],
		});
	});

	it('when filter contains title or body', () => {
		const testTitle = 'testTitle';
		const testBody = 'bodyTitle';
		const filters = new Map([
			['body', [{ relation: 'OR', value: testBody }]],
			['title', [{ relation: 'AND', value: testTitle }]],
		]);

		expect(queryBuilder(filters)).toEqual({
			query: defaultSQL,
			params: [`title:${testTitle} OR body:${testBody}`],
		});
	});

	it('when filter contains text', () => {
		const filters = new Map([
			['text', [{ relation: 'AND', value: 'sampletext' }]],
		]);
		expect(queryBuilder(filters)).toEqual({
			query: defaultSQL,
			params: ['sampletext'],
		});
	});

	it('when filter contains multiple text words', () => {
		const filters = new Map([
			['text', [{ relation: 'AND', value: 'multiple words' }]],
		]);
		expect(queryBuilder(filters)).toEqual({
			query: defaultSQL,
			params: ['multiple words'],
		});
	});

	it('when filter contains phrase text words', () => {
		const filters = new Map([
			['text', [{ relation: 'AND', value: '"multiple words"' }]],
		]);
		expect(queryBuilder(filters)).toEqual({
			query: defaultSQL,
			params: ['"multiple words"'],
		});
	});
});
