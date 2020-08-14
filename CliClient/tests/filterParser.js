/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);
const filterParser = require('lib/services/searchengine/filterParser.js').default;
// import filterParser from 'lib/services/searchengine/filterParser.js';

const makeTerm = (name, value, negated) => { return { name, value, negated }; };
describe('filterParser should be correct filter for keyword', () => {
	it('title', () => {
		const searchString = 'title: something';
		expect(filterParser(searchString)).toContain(makeTerm('title', 'something', false));
	});

	it('negated title', () => {
		const searchString = '-title: something';
		expect(filterParser(searchString)).toContain(makeTerm('title', 'something', true));
	});

	it('body', () => {
		const searchString = 'body:something';
		expect(filterParser(searchString)).toContain(makeTerm('body', 'something', false));
	});

	it('negated body', () => {
		const searchString = '-body:something';
		expect(filterParser(searchString)).toContain(makeTerm('body', 'something', true));
	});

	it('title and body', () => {
		const searchString = 'title:testTitle body:testBody';
		expect(filterParser(searchString)).toContain(makeTerm('title', 'testTitle', false));
		expect(filterParser(searchString)).toContain(makeTerm('body', 'testBody', false));
	});

	it('title with multiple words', () => {
		const searchString = 'title:"word1 word2" body:testBody';
		expect(filterParser(searchString)).toContain(makeTerm('title', 'word1', false));
		expect(filterParser(searchString)).toContain(makeTerm('title', 'word2', false));
		expect(filterParser(searchString)).toContain(makeTerm('body', 'testBody', false));
	});

	it('body with multiple words', () => {
		const searchString = 'title:testTitle body:"word1 word2"';
		expect(filterParser(searchString)).toContain(makeTerm('title', 'testTitle', false));
		expect(filterParser(searchString)).toContain(makeTerm('body', 'word1', false));
		expect(filterParser(searchString)).toContain(makeTerm('body', 'word2', false));
	});

	it('single word text', () => {
		const searchString = 'joplin';
		expect(filterParser(searchString)).toContain(makeTerm('text', '"joplin"', false));
	});

	it('multi word text', () => {
		const searchString = 'scott joplin';
		expect(filterParser(searchString)).toContain(makeTerm('text', '"scott"', false));
		expect(filterParser(searchString)).toContain(makeTerm('text', '"joplin"', false));
	});

	it('negated word text', () => {
		const searchString = 'scott -joplin';
		expect(filterParser(searchString)).toContain(makeTerm('text', '"scott"', false));
		expect(filterParser(searchString)).toContain(makeTerm('text', '"joplin"', true));
	});

	it('phrase text search', () => {
		const searchString = '"scott joplin"';
		expect(filterParser(searchString)).toContain(makeTerm('text', '"scott joplin"', false));
	});

	it('multi word body', () => {
		const searchString = 'body:"foo bar"';
		expect(filterParser(searchString)).toContain(makeTerm('body', 'foo', false));
		expect(filterParser(searchString)).toContain(makeTerm('body', 'bar', false));
	});

	it('negated tag queries', () => {
		const searchString = '-tag:mozart';
		expect(filterParser(searchString)).toContain(makeTerm('tag', 'mozart', true));
	});


	it('created after', () => {
		const searchString = 'created:20151218'; // YYYYMMDD
		expect(filterParser(searchString)).toContain(makeTerm('created', '20151218', false));
	});

	it('created before', () => {
		const searchString = '-created:20151218'; // YYYYMMDD
		expect(filterParser(searchString)).toContain(makeTerm('created', '20151218', true));
	});

	it('any', () => {
		const searchString = 'any:1 tag:123';
		expect(filterParser(searchString)).toContain(makeTerm('any', '1', false));
		expect(filterParser(searchString)).toContain(makeTerm('tag', '123', false));
	});

	it('wildcard tags', () => {
		let searchString = 'tag:*';
		expect(filterParser(searchString)).toContain(makeTerm('tag', '%', false));

		searchString = '-tag:*';
		expect(filterParser(searchString)).toContain(makeTerm('tag', '%', true));

		searchString = 'tag:bl*sphemy';
		expect(filterParser(searchString)).toContain(makeTerm('tag', 'bl%sphemy', false));
	});

	it('wildcard notebooks', () => {
		const searchString = 'notebook:my*notebook';
		expect(filterParser(searchString)).toContain(makeTerm('notebook', 'my%notebook', false));
	});

	it('wildcard MIME types', () => {
		const searchString = 'resource:image/*';
		expect(filterParser(searchString)).toContain(makeTerm('resource', 'image/%', false));
	});

	it('sourceurl', () => {
		let searchString = 'sourceurl:https://www.google.com';
		expect(filterParser(searchString)).toContain(makeTerm('sourceurl', 'https://www.google.com', false));

		searchString = 'sourceurl:https://www.google.com -sourceurl:https://www.facebook.com';
		expect(filterParser(searchString)).toContain(makeTerm('sourceurl', 'https://www.google.com', false));
		expect(filterParser(searchString)).toContain(makeTerm('sourceurl', 'https://www.facebook.com', true));
	});

	it('handle invalid filters', () => {
		let searchString = 'titletitle:123';
		expect(() => filterParser(searchString)).toThrow(new Error('Invalid filter: titletitle'));

		searchString = 'invalid:abc';
		expect(() => filterParser(searchString)).toThrow(new Error('Invalid filter: invalid'));

		searchString = ':abc';
		expect(() => filterParser(searchString)).toThrow(new Error('Invalid filter: '));

		searchString = 'type:blah';
		expect(() => filterParser(searchString)).toThrow(new Error('The value of filter "type" must be "note" or "todo"'));

		searchString = '-type:note';
		expect(() => filterParser(searchString)).toThrow(new Error('type can\'t be negated'));

		searchString = 'iscompleted:blah';
		expect(() => filterParser(searchString)).toThrow(new Error('The value of filter "iscompleted" must be "1" or "0"'));

		searchString = '-notebook:n1';
		expect(() => filterParser(searchString)).toThrow(new Error('notebook can\'t be negated'));

		searchString = '-iscompleted:1';
		expect(() => filterParser(searchString)).toThrow(new Error('iscompleted can\'t be negated'));

	});
});
