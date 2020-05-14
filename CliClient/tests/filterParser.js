/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);
const filterParser = require('lib/services/filterParser.js');


describe('filterParser should be correct filter for keyword', () => {
	it('title', () => {
		const searchString = 'title:something';
		const expected = [{
			name: 'title',
			relation: 'AND',
			value: 'something',
		}];
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('body', () => {
		const searchString = 'body:something';
		const expected = [{
			name: 'body',
			relation: 'AND',
			value: 'something',
		}];
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('title and body', () => {
		const searchString = 'title:testTitle body:testBody';
		const expected = [
			{
				name: 'title',
				relation: 'AND',
				value: 'testTitle',
			},
			{
				name: 'body',
				relation: 'AND',
				value: 'testBody',
			},
		];
		expect(filterParser(searchString)).toEqual(expected);
	});
});
