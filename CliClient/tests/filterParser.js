/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);
const filterParser = require('lib/services/searchengine/filterParser.js').default;
// import filterParser from 'lib/services/searchengine/filterParser.js';

describe('filterParser should be correct filter for keyword', () => {
	it('title', () => {
		const searchString = 'title: something';
		const expected = new Map([
			['title', ['something']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('negated title', () => {
		const searchString = '-title: something';
		const expected = new Map([
			['-title', ['something']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('body', () => {
		const searchString = 'body:something';
		const expected = new Map([
			['body', ['something']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('negated body', () => {
		const searchString = '-body:something';
		const expected = new Map([
			['-body', ['something']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('title and body', () => {
		const searchString = 'title:testTitle body:testBody';
		const expected = new Map([
			['title', ['testTitle']],
			['body', ['testBody']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('title with multiple words', () => {
		const searchString = 'title:"word1 word2" body:testBody';
		const expected = new Map([
			['title', ['word1', 'word2']],
			['body', ['testBody']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('body with multiple words', () => {
		const searchString = 'title:testTitle body:"word1 word2"';
		const expected = new Map([
			['title', ['testTitle']],
			['body', ['word1', 'word2']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('single word text', () => {
		const searchString = 'babayaga';
		const expected = new Map([
			['text', ['babayaga']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('multi word text', () => {
		const searchString = 'baba yaga';
		const expected = new Map([
			['text', ['baba', 'yaga']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('negated word text', () => {
		const searchString = 'baba -yaga';
		const expected = new Map([
			['text', ['baba']],
			['-text', ['yaga']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('phrase text search', () => {
		const searchString = '"baba yaga"';
		const expected = new Map([
			['text', ['"baba yaga"']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('multi word body', () => {
		const searchString = 'body:"foo bar"';
		const expected = new Map([
			['body', ['foo', 'bar']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('negated tag queries', () => {
		const searchString = '-tag:instagram';
		const expected = new Map([
			['-tag', ['instagram']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});


	it('created on', () => {
		const searchString = 'created:20151218'; // YYYYMMDD
		const expected = new Map([
			['created', ['20151218']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});


	it('created in between', () => {
		const searchString = 'created:20151218..20160118';
		const expected = new Map([
			['created', ['20151218..20160118']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

});
