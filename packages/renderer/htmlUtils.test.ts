import htmlUtils, { extractHtmlBody, htmlDocIsImageOnly } from './htmlUtils';

describe('htmlUtils', () => {

	test('should strip off HTML', () => {
		const testCases = [
			[
				'',
				'',
			],
			[
				'<b>test</b>',
				'test',
			],
			[
				'Joplin&circledR;',
				'Joplin®',
			],
			[
				'&lt;b&gttest&lt;/b&gt',
				'&lt;b>test&lt;/b>',
			],
		];

		for (const t of testCases) {
			const [input, expected] = t;
			const actual = htmlUtils.stripHtml(input);
			expect(actual).toBe(expected);
		}
	});

	test('should extract the HTML body', () => {
		const testCases: [string, string][] = [
			[
				'Just <b>testing</b>',
				'Just <b>testing</b>',
			],
			[
				'',
				'',
			],
			[
				'<html><head></head><meta bla><body>Here is the body<img src="test.png"/></body></html>',
				'Here is the body<img src="test.png"/>',
			],
		];

		for (const [input, expected] of testCases) {
			const actual = extractHtmlBody(input);
			expect(actual).toBe(expected);
		}
	});

	test('should tell if an HTML document is an image only', () => {
		const testCases: [string, boolean][] = [
			[
				// This is the kind of HTML that's pasted when copying an image from Chrome
				'<meta charset=\'utf-8\'>\n<img src="https://example.com/img.png"/>',
				true,
			],
			[
				'',
				false,
			],
			[
				'<img src="https://example.com/img.png"/>',
				true,
			],
			[
				'<img src="https://example.com/img.png"/><img src="https://example.com/img.png"/>',
				false,
			],
			[
				'<img src="https://example.com/img.png"/><p>Some text</p>',
				false,
			],
			[
				'<img src="https://example.com/img.png"/> Some text',
				false,
			],
		];

		for (const [input, expected] of testCases) {
			const actual = htmlDocIsImageOnly(input);
			expect(actual).toBe(expected);
		}
	});

});
