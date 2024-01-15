import filterParser from './filterParser';

const makeTerm = (name: string, value: string, negated: boolean, quoted = false, wildcard = false) => {
	if (name === 'text') { return { name, value, negated, quoted, wildcard }; }
	if (name === 'title' || name === 'body') { return { name, value, negated, wildcard }; }
	return { name, value, negated };
};

describe('filterParser should be correct filter for keyword', () => {
	it('title', () => {
		const searchString = 'title: something';
		expect(filterParser(searchString)).toContainEqual(makeTerm('title', 'something', false));
	});

	it('negated title', () => {
		const searchString = '-title: something';
		expect(filterParser(searchString)).toContainEqual(makeTerm('title', 'something', true));
	});

	it('body', () => {
		const searchString = 'body:something';
		expect(filterParser(searchString)).toContainEqual(makeTerm('body', 'something', false));
	});

	it('negated body', () => {
		const searchString = '-body:something';
		expect(filterParser(searchString)).toContainEqual(makeTerm('body', 'something', true));
	});

	it('title and body', () => {
		const searchString = 'title:testTitle body:testBody';
		expect(filterParser(searchString)).toContainEqual(makeTerm('title', 'testTitle', false));
		expect(filterParser(searchString)).toContainEqual(makeTerm('body', 'testBody', false));
	});

	it('title with multiple words', () => {
		const searchString = 'title:"word1 word2" body:testBody';
		expect(filterParser(searchString)).toContainEqual(makeTerm('title', 'word1', false));
		expect(filterParser(searchString)).toContainEqual(makeTerm('title', 'word2', false));
		expect(filterParser(searchString)).toContainEqual(makeTerm('body', 'testBody', false));
	});

	it('body with multiple words', () => {
		const searchString = 'title:testTitle body:"word1 word2"';
		expect(filterParser(searchString)).toContainEqual(makeTerm('title', 'testTitle', false));
		expect(filterParser(searchString)).toContainEqual(makeTerm('body', 'word1', false));
		expect(filterParser(searchString)).toContainEqual(makeTerm('body', 'word2', false));
	});

	it('single word text', () => {
		const searchString = 'joplin';
		expect(filterParser(searchString)).toContainEqual(makeTerm('text', '"joplin"', false));
	});

	it('multi word text', () => {
		const searchString = 'scott joplin';
		expect(filterParser(searchString)).toContainEqual(makeTerm('text', '"scott"', false));
		expect(filterParser(searchString)).toContainEqual(makeTerm('text', '"joplin"', false));
	});

	it('negated word text', () => {
		const searchString = 'scott -joplin';
		expect(filterParser(searchString)).toContainEqual(makeTerm('text', '"scott"', false));
		expect(filterParser(searchString)).toContainEqual(makeTerm('text', '"joplin"', true));
	});

	it('phrase text search', () => {
		const searchString = '"scott joplin"';
		expect(filterParser(searchString)).toContainEqual(makeTerm('text', '"scott joplin"', false, true));
	});

	it('multi word body', () => {
		const searchString = 'body:"foo bar"';
		expect(filterParser(searchString)).toContainEqual(makeTerm('body', 'foo', false));
		expect(filterParser(searchString)).toContainEqual(makeTerm('body', 'bar', false));
	});

	it('negated tag queries', () => {
		const searchString = '-tag:mozart';
		expect(filterParser(searchString)).toContainEqual(makeTerm('tag', 'mozart', true));
	});


	it('created after', () => {
		const searchString = 'created:20151218'; // YYYYMMDD
		expect(filterParser(searchString)).toContainEqual(makeTerm('created', '20151218', false));
	});

	it('created before', () => {
		const searchString = '-created:20151218'; // YYYYMMDD
		expect(filterParser(searchString)).toContainEqual(makeTerm('created', '20151218', true));
	});

	it('any', () => {
		const searchString = 'any:1 tag:123';
		expect(filterParser(searchString)).toContainEqual(makeTerm('any', '1', false));
		expect(filterParser(searchString)).toContainEqual(makeTerm('tag', '123', false));
	});

	it('wildcard tags', () => {
		let searchString = 'tag:*';
		expect(filterParser(searchString)).toContainEqual(makeTerm('tag', '%', false));

		searchString = '-tag:*';
		expect(filterParser(searchString)).toContainEqual(makeTerm('tag', '%', true));

		searchString = 'tag:bl*sphemy';
		expect(filterParser(searchString)).toContainEqual(makeTerm('tag', 'bl%sphemy', false));

		searchString = 'tag:"space travel"';
		expect(filterParser(searchString)).toContainEqual(makeTerm('tag', 'space travel', false));
	});

	it('wildcard notebooks', () => {
		const searchString = 'notebook:my*notebook';
		expect(filterParser(searchString)).toContainEqual(makeTerm('notebook', 'my%notebook', false));
	});

	it('wildcard MIME types', () => {
		const searchString = 'resource:image/*';
		expect(filterParser(searchString)).toContainEqual(makeTerm('resource', 'image/%', false));
	});

	it('sourceurl', () => {
		let searchString = 'sourceurl:https://www.google.com';
		expect(filterParser(searchString)).toContainEqual(makeTerm('sourceurl', 'https://www.google.com', false));

		searchString = 'sourceurl:https://www.google.com -sourceurl:https://www.facebook.com';
		expect(filterParser(searchString)).toContainEqual(makeTerm('sourceurl', 'https://www.google.com', false));
		expect(filterParser(searchString)).toContainEqual(makeTerm('sourceurl', 'https://www.facebook.com', true));
	});

	it('handle invalid filters', () => {
		let searchString = 'titletitle:123';
		expect(filterParser(searchString)).toContainEqual(makeTerm('text', '"titletitle:123"', false));

		searchString = 'invalid:abc';
		expect(filterParser(searchString)).toContainEqual(makeTerm('text', '"invalid:abc"', false));

		searchString = '-invalid:abc';
		expect(filterParser(searchString)).toContainEqual(makeTerm('text', '"invalid:abc"', true));

		searchString = ':abc';
		expect(filterParser(searchString)).toContainEqual(makeTerm('text', '":abc"', false));

		searchString = 'type:blah';
		expect(() => filterParser(searchString)).toThrow(new Error('The value of filter "type" must be "note" or "todo"'));

		searchString = '-type:note';
		expect(() => filterParser(searchString)).toThrow(new Error('type can\'t be negated'));

		searchString = 'iscompleted:blah';
		expect(() => filterParser(searchString)).toThrow(new Error('The value of filter "iscompleted" must be "1" or "0"'));


		searchString = '-iscompleted:1';
		expect(() => filterParser(searchString)).toThrow(new Error('iscompleted can\'t be negated'));

	});
});
