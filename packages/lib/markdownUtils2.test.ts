/* eslint-disable no-unused-vars */

import markdownUtils from './markdownUtils';

describe('markdownUtils', () => {



	it('should prepend a base URL', (async () => {
		const baseUrl = 'https://test.com/site';

		const testCases = [
			['[something](testing.html)', '[something](https://test.com/site/testing.html)'],
			['![something](/img/test.png)', '![something](https://test.com/img/test.png)'],
			['[![something](/img/test.png)](/index.html "Home page")', '[![something](https://test.com/img/test.png)](https://test.com/index.html "Home page")'],
			['[onelink.com](/jmp/?id=123&u=http://something.com/test)', '[onelink.com](https://test.com/jmp/?id=123&u=http://something.com/test)'],
			['[![some text](/img/test.png)](/jmp/?s=80&l=related&u=http://example.com "some description")', '[![some text](https://test.com/img/test.png)](https://test.com/jmp/?s=80&l=related&u=http://example.com "some description")'],
		];

		for (let i = 0; i < testCases.length; i++) {
			const md = testCases[i][0];
			const expected = testCases[i][1];
			expect(markdownUtils.prependBaseUrl(md, baseUrl)).toBe(expected);
		}
	}));

	it('should extract image URLs', (async () => {
		const testCases = [
			['![something](http://test.com/img.png)', ['http://test.com/img.png']],
			['![something](http://test.com/img.png) ![something2](http://test.com/img2.png)', ['http://test.com/img.png', 'http://test.com/img2.png']],
			['![something](http://test.com/img.png "Some description")', ['http://test.com/img.png']],
			['![something](https://test.com/ohoh_(123).png)', ['https://test.com/ohoh_(123).png']],
			['![nothing]() ![something](http://test.com/img.png)', ['http://test.com/img.png']],
			['![something](img.png)', ['img.png']],
			['![something](/img.png)', ['/img.png']],
			['![something](../img.png)', ['../img.png']],
			['![something](../upload/img.png)', ['../upload/img.png']],
			['![something](./upload/img.png)', ['./upload/img.png']],
			['[something](testing.html)', ['']],
			['[something](img.png)', ['']],
			['![something](file://img.png)', ['file://img.png']],
		];

		for (let i = 0; i < testCases.length; i++) {
			const md = testCases[i][0] as string;
			const actual = markdownUtils.extractImageUrls(md);
			const expected = testCases[i][1];
			expect(actual.join(' ')).toBe((expected as string[]).join(' '));
		}
	}));

	it('should extract files URLs', (async () => {
		const testCases = [
			['[something](http://test.com/img.png)', ['http://test.com/img.png']],
			['[something](http://test.com/test.txt)', ['http://test.com/test.txt']],
			['[something](http://test.com/img.png) ![something2](http://test.com/img2.png)', ['http://test.com/img.png', 'http://test.com/img2.png']],
			['[something](http://test.com/img.png "Some description")', ['http://test.com/img.png']],
			['[something](https://test.com/ohoh_(123).png)', ['https://test.com/ohoh_(123).png']],
			['[nothing]() ![something](http://test.com/img.png)', ['http://test.com/img.png']],
			['[something](test.txt)', ['test.txt']],
			['[something](/test.txt)', ['/test.txt']],
			['[something](../test.txt)', ['../test.txt']],
			['[something](../upload/test.txt)', ['../upload/test.txt']],
			['[something](./upload/test.txt)', ['./upload/test.txt']],
			['[something](testing.html)', ['testing.html']],
			['[something](img.png)', ['img.png']],
			['[something](file://img.png)', ['file://img.png']],
		];

		for (let i = 0; i < testCases.length; i++) {
			const md = testCases[i][0] as string;
			const actual = markdownUtils.extractFileUrls(md);
			const expected = testCases[i][1];

			expect(actual.join(' ')).toBe((expected as string[]).join(' '));
		}
	}));

	it('escape a markdown link', (async () => {

		const testCases = [
			['file:///Users/who put spaces in their username??/.config/joplin', 'file:///Users/who%20put%20spaces%20in%20their%20username??/.config/joplin'],
			['file:///Users/(and brackets???)/.config/joplin', 'file:///Users/%28and%20brackets???%29/.config/joplin'],
			['file:///Users/thisisfine/.config/joplin', 'file:///Users/thisisfine/.config/joplin'],
		];

		for (let i = 0; i < testCases.length; i++) {
			const md = testCases[i][0];
			const expected = testCases[i][1];
			expect(markdownUtils.escapeLinkUrl(md)).toBe(expected);
		}
	}));

	it('escape a markdown link (title)', (async () => {

		const testCases = [
			['Helmut K. C. Tessarek', 'Helmut K. C. Tessarek'],
			['Helmut (K. C.) Tessarek', 'Helmut (K. C.) Tessarek'],
			['Helmut [K. C.] Tessarek', 'Helmut \\[K. C.\\] Tessarek'],
		];

		for (let i = 0; i < testCases.length; i++) {
			const md = testCases[i][0];
			const expected = testCases[i][1];
			expect(markdownUtils.escapeTitleText(md)).toBe(expected);
		}
	}));

	it.each([
		['Test case [one](link)', 'Test case one'],
		['Test case ![two](imagelink)', 'Test case two'],
		['**# -Test case three', 'Test case three'],
		['This is a looooooong tiiitlllle with moore thaaaaaaan eighty characters and a [link](linkurl) at the end', 'This is a looooooong tiiitlllle with moore thaaaaaaan eighty characters and a li'],
		['', ''],
		['These are [link1](one), [link2](two) and ![link3](three)', 'These are link1, link2 and link3'],
		['No description link to [](https://joplinapp.org)', 'No description link to https://joplinapp.org'],
		['&nbsp;\n\nThis is a test &nbsp; test.', 'This is a test   test.'],
	])('should create a default note title from the note body (%j -> %j)', (body, expectedTitle) => {
		expect(markdownUtils.titleFromBody(body)).toBe(expectedTitle);
	});

});
