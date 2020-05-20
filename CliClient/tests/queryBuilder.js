/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

// For pretty printing.
// See https://stackoverflow.com/questions/23676459/karma-jasmine-pretty-printing-object-comparison/26324116
jasmine.pp = function(obj) {
	return JSON.stringify(obj, undefined, 2);
};

const { queryBuilder } = require('lib/services/searchengine/queryBuilder.js');

const tagSQL = 'tag_filter as (SELECT note_tags.note_id as id FROM note_tags WHERE 1 INTERSECT SELECT note_tags.note_id FROM note_tags WHERE note_tags.tag_id IN (SELECT tags.id from tags WHERE tags.title LIKE ?))';
const negatedTagSQL = tagSQL.replace('INTERSECT', 'EXCEPT');
const tagDoubleSQL = 'tag_filter as (SELECT note_tags.note_id as id FROM note_tags WHERE 1 INTERSECT SELECT note_tags.note_id FROM note_tags WHERE note_tags.tag_id IN (SELECT tags.id from tags WHERE tags.title LIKE ?) INTERSECT SELECT note_tags.note_id FROM note_tags WHERE note_tags.tag_id IN (SELECT tags.id from tags WHERE tags.title LIKE ?))';

const notebookSQL = `child_notebooks(id) as (select folders.id from folders where id=(select id from folders where folders.title LIKE ?)
union all select folders.id from folders JOIN child_notebooks on folders.parent_id=child_notebooks.id)`;
// select * from child_notebooks;`

const defaultSQL = `SELECT
	notes_fts.id,
	notes_fts.title AS normalized_title,
	notes_fts.created_time,
	notes_fts.updated_time,
	notes_fts.is_todo,
	notes_fts.todo_completed,
	notes_fts.parent_id
	FROM notes_fts WHERE 1`;

const defaultMatchSQL = `${defaultSQL} AND notes_fts MATCH ?`;

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

	it('when filter contains mulitple words in title', () => {
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

	it('when filter contains multiple words in body', () => {
		const testTitle = 'testTitle';
		const testBody = ['foo', 'bar'];
		const filters = new Map([
			['title', [{ relation: 'AND', value: testTitle }]],
			[
				'body',
				[
					{ relation: 'AND', value: testBody[0] },
					{ relation: 'AND', value: testBody[1] },
				],
			],
		]);

		expect(queryBuilder(filters)).toEqual({
			query: defaultMatchSQL,
			params: [`title:${testTitle} body:${testBody[0]} body:${testBody[1]}`],
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
			query: `WITH RECURSIVE ${tagSQL} ${defaultSQL} AND ROWID IN (SELECT notes.ROWID from (tag_filter) JOIN notes on tag_filter.id=notes.id)`,
			params: ['tag123'],
		});

		filters = new Map([
			['tag', [{ relation: 'AND', value: 'tag123' }, { relation: 'AND', value: 'tag345' }]],
		]);
		expect(queryBuilder(filters)).toEqual({
			query: `WITH RECURSIVE ${tagDoubleSQL} ${defaultSQL} AND ROWID IN (SELECT notes.ROWID from (tag_filter) JOIN notes on tag_filter.id=notes.id)`,
			params: ['tag123', 'tag345'],
		});
	});

	it('when filter contains negated tags', () => {
		const filters = new Map([
			['tag', [{ relation: 'NOT', value: 'instagram' }]],
		]);
		expect(queryBuilder(filters)).toEqual({
			query: `WITH RECURSIVE ${negatedTagSQL} ${defaultSQL} AND ROWID IN (SELECT notes.ROWID from (tag_filter) JOIN notes on tag_filter.id=notes.id)`,
			params: ['instagram'],
		});
	});

	it('when filter contains notebook', () => {
		let filters = new Map([
			['notebook', [{ relation: 'AND', value: 'notebook1' }]],
		]);
		expect(queryBuilder(filters)).toEqual({
			query: `WITH RECURSIVE ${notebookSQL} ${defaultSQL} AND ROWID IN (SELECT notes.ROWID from (child_notebooks) JOIN notes on notes.parent_id=child_notebooks.id)`,
			params: ['notebook1'],
		});

		filters = new Map([
			['notebook', [{ relation: 'NOT', value: 'notebook1' }]],
		]);
		expect(queryBuilder(filters)).toEqual({
			query: `WITH RECURSIVE ${notebookSQL} ${defaultSQL} AND ROWID NOT IN (SELECT notes.ROWID from (child_notebooks) JOIN notes on notes.parent_id=child_notebooks.id)`,
			params: ['notebook1'],
		});


	});


});
