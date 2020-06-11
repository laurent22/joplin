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

	it('body', () => {
		const searchString = 'body:something';
		const expected = new Map([
			['body', ['something']],
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

	// it('title or title', () => {
	// 	const searchString = 'title:testTitle1 OR title:testTitle2';
	// 	const expected = new Map([
	// 		['title', ['testTitle1', 'testTitle2']],
	// 	]);
	// 	expect(filterParser(searchString)).toEqual(expected);
	// });

	// it('body or body', () => {
	// 	const searchString = 'body:testBody1 OR body:testBody2';
	// 	const expected = new Map([
	// 		['body', ['testBody1', 'testBody2']],
	// 	]);
	// 	expect(filterParser(searchString)).toEqual(expected);
	// });

	// it('title or body', () => {
	// 	const searchString = 'title:testTitle1 OR body:testBody2';
	// 	const expected = new Map([
	// 		['title', ['testTitle1']],
	// 		['body', ['testBody2']],
	// 	]);
	// 	expect(filterParser(searchString)).toEqual(expected);
	// });

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

	it('tag', () => {
		const searchString = 'tag:tag123';
		const expected = new Map([
			['tag', ['tag123']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('multiple tags', () => {
		const searchString = 'tag:tag123 tag:tag456';
		const expected = new Map([
			['tag', ['tag123', 'tag456']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	// it('tag or tag', () => {
	// 	const searchString = 'tag:tag123 or tag:tag456';
	// 	const expected = new Map([
	// 		['tag', ['tag123', 'tag456']],
	// 	]);
	// 	expect(filterParser(searchString)).toEqual(expected);
	// });

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

	it('in a notebook', () => {
		const searchString = 'notebook:notebook1';
		const expected = new Map([
			['notebook', ['notebook1']],
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

	it('created less than', () => {
		const searchString = 'created:<20151218';
		const expected = new Map([
			['created', ['<20151218']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('created greater than', () => {
		const searchString = 'created:>20151218';
		const expected = new Map([
			['created', ['>20151218']],
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

	it('updated on', () => {
		const searchString = 'updated:20151218'; // YYYYMMDD
		const expected = new Map([
			['updated', ['20151218']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('created on smart value, day', () => {
		const searchString = 'created:day-1';
		const expected = new Map([
			['created', ['day-1']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('is of type todo', () => {
		const searchString = 'type:todo';
		const expected = new Map([
			['type', ['todo']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('is a completed todo', () => {
		const searchString = 'iscompleted:1';
		const expected = new Map([
			['iscompleted', ['1']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

	it('is a uncompleted todo', () => {
		const searchString = 'iscompleted:0';
		const expected = new Map([
			['iscompleted', ['0']],
		]);
		expect(filterParser(searchString)).toEqual(expected);
	});

});
