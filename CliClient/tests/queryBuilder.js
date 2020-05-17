/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

// For pretty printing.
// See https://stackoverflow.com/questions/23676459/karma-jasmine-pretty-printing-object-comparison/26324116
jasmine.pp = function(obj) {
	return JSON.stringify(obj, undefined, 2);
};

const { queryBuilder } = require('lib/services/queryBuilder.js');

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
	LEFT JOIN notes ON notes_fts.id = notes.id WHERE 1`;

const defaultMatchSQL = `${defaultSQL} AND notes_fts MATCH (?)`;

const defaultTagSQL = `${defaultSQL} AND notes.id IN (SELECT note_tags.note_id FROM note_tags WHERE 1`;


describe('queryBuilder should give correct sql', () => {
	it('when filter is just the title', () => {
		const testTitle = 'someTitle';
		const filters = new Map([
			['title', [{ relation: 'AND', value: testTitle }]],
		]);

		expect(queryBuilder(filters)).toEqual({
			query: defaultMatchSQL,
			params: [`title:${testTitle}`],
		});
	});

	it('when filter contains only body', () => {
		const testBody = 'someBody';
		const filters = new Map([['body', [{ relation: 'AND', value: testBody }]]]);

		expect(queryBuilder(filters)).toEqual({
			query: defaultMatchSQL,
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
			query: defaultMatchSQL,
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
			query: defaultMatchSQL,
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
			query: defaultMatchSQL,
			params: [`title:${testTitle} OR body:${testBody}`],
		});
	});

	it('when filter contains text', () => {
		const filters = new Map([
			['text', [{ relation: 'AND', value: 'sampletext' }]],
		]);
		expect(queryBuilder(filters)).toEqual({
			query: defaultMatchSQL,
			params: ['sampletext'],
		});
	});

	it('when filter contains multiple text words', () => {
		const filters = new Map([
			['text', [{ relation: 'AND', value: 'multiple words' }]],
		]);
		expect(queryBuilder(filters)).toEqual({
			query: defaultMatchSQL,
			params: ['multiple words'],
		});
	});

	it('when filter contains phrase text words', () => {
		const filters = new Map([
			['text', [{ relation: 'AND', value: '"multiple words"' }]],
		]);
		expect(queryBuilder(filters)).toEqual({
			query: defaultMatchSQL,
			params: ['"multiple words"'],
		});
	});

	it('when filter contains tags', () => {
		let filters = new Map([
			['tag', [{ relation: 'AND', value: 'tag123' }]],
		]);
		expect(queryBuilder(filters)).toEqual({
			query: `${defaultTagSQL}` + ' INTERSECT SELECT note_tags.note_id FROM note_tags WHERE note_tags.tag_id IN (select tags.id from tags WHERE tags.title LIKE ?))',
			params: ['tag123'],
		});

		filters = new Map([
			['tag', [{ relation: 'AND', value: 'tag123' }, { relation: 'AND', value: 'tag345' }]],
		]);
		expect(queryBuilder(filters)).toEqual({
			query: `${defaultTagSQL}` + ' INTERSECT SELECT note_tags.note_id FROM note_tags WHERE note_tags.tag_id IN (select tags.id from tags WHERE tags.title LIKE ?) INTERSECT SELECT note_tags.note_id FROM note_tags WHERE note_tags.tag_id IN (select tags.id from tags WHERE tags.title LIKE ?))',
			params: ['tag123', 'tag345'],
		});
	});
});
