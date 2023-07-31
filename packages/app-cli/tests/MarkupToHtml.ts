
import MarkupToHtml, { MarkupLanguage, RenderResult } from '@joplin/renderer/MarkupToHtml';

describe('MarkupToHtml', () => {

	it('should strip markup', (async () => {
		const service = new MarkupToHtml();

		const testCases = {
			[MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN]: [
				['', ''],
				['## hello', 'hello'],
				['## hello **hello!**', 'hello hello!'],
				['*hi!*', 'hi!'],
				['Some `code` here', 'Some code here'],
				['Some <s>html</s> here', 'Some html here'],
				['Some &amp; here', 'Some & here'],
				['Some & here', 'Some & here'],
				['[![image alt](:/fe9ea7fa727e4375b2e7d8a1b873314d)](https://example.com)', ''],
			],
			[MarkupToHtml.MARKUP_LANGUAGE_HTML]: [
				['<h1>hello</h1>', 'hello'],
				['Some <b>strong</b> text', 'Some strong text'],
				['<b>M&amp;Ms</b>', 'M&Ms'],
				['<style>BODY{margin:0;padding:0;background:#f0f0f0}</style>', ''],
			],
		};

		for (const markup in testCases) {
			for (const t of testCases[markup]) {
				const input = t[0];
				const expected = t[1];
				const actual = service.stripMarkup(Number(markup), input);
				expect(actual).toBe(expected);
			}
		}

		expect(service.stripMarkup(1, 'one line\n\ntwo line', { collapseWhiteSpaces: true })).toBe('one line two line');
		expect(service.stripMarkup(1, 'one line    two line', { collapseWhiteSpaces: true })).toBe('one line two line');
		expect(service.stripMarkup(1, 'one line\n    two line', { collapseWhiteSpaces: true })).toBe('one line two line');
	}));


	test('should escape HTML in safe mode', async () => {
		const service = new MarkupToHtml({ isSafeMode: true });

		const testString = '</pre>.<b>Test</b>';
		const expectedOutput: RenderResult = {
			html: '<pre>&lt;/pre&gt;.&lt;b&gt;Test&lt;/b&gt;</pre>',
			cssStrings: [],
			pluginAssets: [],
		};

		expect(await service.render(MarkupLanguage.Html, testString, {}, {})).toMatchObject(expectedOutput);
		expect(await service.render(MarkupLanguage.Markdown, testString, {}, {})).toMatchObject(expectedOutput);
	});
});
