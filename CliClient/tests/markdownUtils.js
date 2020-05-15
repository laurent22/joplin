/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { asyncTest } = require('test-utils.js');
const markdownUtils = require('lib/markdownUtils.js');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('markdownUtils', function() {

	beforeEach(async (done) => {
		done();
	});

	it('should prepend a base URL', asyncTest(async () => {
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

	it('should extract image URLs', asyncTest(async () => {
		const testCases = [
			['![something](http://test.com/img.png)', ['http://test.com/img.png']],
			['![something](http://test.com/img.png) ![something2](http://test.com/img2.png)', ['http://test.com/img.png', 'http://test.com/img2.png']],
			['![something](http://test.com/img.png "Some description")', ['http://test.com/img.png']],
			['![something](https://test.com/ohoh_(123).png)', ['https://test.com/ohoh_(123).png']],
			['![nothing]() ![something](http://test.com/img.png)', ['http://test.com/img.png']],
		];

		for (let i = 0; i < testCases.length; i++) {
			const md = testCases[i][0];
			const actual = markdownUtils.extractImageUrls(md);
			const expected = testCases[i][1];

			expect(actual.join(' ')).toBe(expected.join(' '));
		}
	}));

	it('escape a markdown link (title)', asyncTest(async () => {

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

	it('replace markdown link with description', asyncTest(async () => {

		const testCases = [
			['Test case [one](link)', 'Test case one'],
			['Test case ![two](imagelink)', 'Test case two'],
			['**# -Test case three', 'Test case three'],
			['This is a looooooong tiiitlllle with moore thaaaaaaan eighty characters and a [link](linkurl) at the end', 'This is a looooooong tiiitlllle with moore thaaaaaaan eighty characters and a li'],
			['', ''],
			['These are [link1](one), [link2](two) and ![link3](three)', 'These are link1, link2 and link3'],
			['No description link to [](https://joplinapp.org)', 'No description link to https://joplinapp.org'],
		];

		for (let i = 0; i < testCases.length; i++) {
			const md = testCases[i][0];
			const expected = testCases[i][1];
			expect(markdownUtils.titleFromBody(md)).toBe(expected);
		}
	}));

	it('should remove Markdown syntax elements from the text', asyncTest(async () => {
		const inputStrings = [
			'', // Empty string
			'This is some plain text', // Plain text
			'## This is a header', // Header syntax
			'This is a text with **bold** and *italicized* text', // Text with annotations
			'This is a text with __bold__ and _italicized_ text', // Text with annotations alternate form
			'[link to google](https://www.google.com/)', // Link
			'> This is a blockquote\n And another line', // Blockquote
			'* List item\n* List item', // Unordered list
			'- List item\n- List item', // Unordered list
			'1. List item\n2. List item', // Ordered list
			'This is some `inline code`', // Inlined code
		];

		const expectedOutputStrings = [
			'',
			'This is some plain text',
			'This is a header',
			'This is a text with bold and italicized text',
			'This is a text with bold and italicized text',
			'link to google',
			'This is a blockquote\n And another line',
			'List item\nList item',
			'List item\nList item',
			'List item\nList item',
			'This is some inline code',
		];

		expect(inputStrings.length).toBe(expectedOutputStrings.length);

		for (let i = 0; i < inputStrings.length; i++) {
			const outputString = markdownUtils.stripMarkdown(inputStrings[i]);
			expect(outputString).toBe(expectedOutputStrings[i]);
		}
	}));

});
