/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);
const { filterParser } = require('lib/services/searchengine/filterParser.js');
// import filterParser from 'lib/services/searchengine/filterParser.js';

describe('filterParser should be correct filter for keyword', () => {
	it('title', () => {
		const searchString = 'title:something';
		const expected = new Map([
			['title', [{ relation: 'AND', value: 'something' }]],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('body', () => {
		const searchString = 'body:something';
		const expected = new Map([
			['body', [{ relation: 'AND', value: 'something' }]],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('title and body', () => {
		const searchString = 'title:testTitle body:testBody';
		const expected = new Map([
			['title', [{ relation: 'AND', value: 'testTitle' }]],
			['body', [{ relation: 'AND', value: 'testBody' }]],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('title with multiple words', () => {
		const searchString = 'title:"word1 word2" body:testBody';
		const expected = new Map([
			['title', [{ relation: 'AND', value: 'word1' }, { relation: 'AND', value: 'word2' }]],
			['body', [{ relation: 'AND', value: 'testBody' }]],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('body with multiple words', () => {
		const searchString = 'title:testTitle body:"word1 word2"';
		const expected = new Map([
			['title', [{ relation: 'AND', value: 'testTitle' }]],
			['body', [{ relation: 'AND', value: 'word1' }, { relation: 'AND', value: 'word2' }]],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('title or title', () => {
		const searchString = 'title:testTitle1 OR title:testTitle2';
		const expected = new Map([
			['title', [{ relation: 'AND', value: 'testTitle1' }, { relation: 'OR', value: 'testTitle2' }]],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('body or body', () => {
		const searchString = 'body:testBody1 OR body:testBody2';
		const expected = new Map([
			['body', [{ relation: 'AND', value: 'testBody1' }, { relation: 'OR', value: 'testBody2' }]],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('title or body', () => {
		const searchString = 'title:testTitle1 OR body:testBody2';
		const expected = new Map([
			['title', [{ relation: 'AND', value: 'testTitle1' }]],
			['body', [{ relation: 'OR', value: 'testBody2' }]],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('single word text', () => {
		const searchString = 'babayaga';
		const expected = new Map([
			['text', [{ relation: 'AND', value: 'babayaga' }]],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('multi word text', () => {
		const searchString = 'baba yaga';
		const expected = new Map([
			['text', [{ relation: 'AND', value: 'baba' }, { relation: 'AND', value: 'yaga' }]],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('phrase text search', () => {
		const searchString = '"baba yaga"';
		const expected = new Map([
			['text', [{ relation: 'AND', value: '"baba yaga"' }]],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('filter by tag', () => {
		const searchString = 'tag:tag123';
		const expected = new Map([
			['tag', [{ relation: 'AND', value: 'tag123' }]],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('filter by multiple tags', () => {
		const searchString = 'tag:tag123 tag:tag456';
		const expected = new Map([
			['tag', [{ relation: 'AND', value: 'tag123' }, { relation: 'AND', value: 'tag456' }]],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

});
