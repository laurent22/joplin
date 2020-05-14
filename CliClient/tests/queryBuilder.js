/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);
const queryBuilder = require('lib/services/queryBuilder.js');

const defaultSQL = `SELECT
        notes_fts.id,
        notes_fts.title,
        notes_fts.body,
        offsets(notes_fts) AS offsets,
        notes.title,
        notes.user_updated_time,
        notes.is_todo,
        notes.todo_completed,
        notes.parent_id
    FROM notes_fts
    LEFT JOIN notes ON notes_fts.id = notes.id
    WHERE
    notes_fts MATCH ?`;

describe('queryBuilder should give correct sql', () => {
	it('when filter contains only title', () => {
		const filters = [
			{
				name: 'title',
				relation: 'AND',
				value: 'someTitle',
			},
		];

		expect(queryBuilder(filters)).toEqual({
			query: defaultSQL,
			params: ['AND title:someTitle'],
		});
	});

	it('when filter contains only body', () => {
		const filters = [
			{
				name: 'body',
				relation: 'AND',
				value: 'someBody',
			},
		];
		expect(queryBuilder(filters)).toEqual({
			query: defaultSQL,
			params: ['AND body:someBody'],
		});
	});

	it('when filter contains title and body', () => {
		const filters = [
			{
				name: 'title',
				relation: 'AND',
				value: 'someTitle',
			},
			{
				name: 'body',
				relation: 'AND',
				value: 'someBody',
			},
		];
		expect(queryBuilder(filters)).toEqual({
			query: defaultSQL,
			params: ['AND title:someTitle AND body:someBody'],
		});
	});
});
