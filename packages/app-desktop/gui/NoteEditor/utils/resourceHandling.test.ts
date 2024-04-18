import Setting from '@joplin/lib/models/Setting';
import { processPastedHtml } from './resourceHandling';
import markupLanguageUtils from '@joplin/lib/markupLanguageUtils';
import HtmlToMd from '@joplin/lib/HtmlToMd';
import { HtmlToMarkdownHandler, MarkupToHtmlHandler } from './types';

const createTestMarkupConverters = () => {
	const markupToHtml: MarkupToHtmlHandler = async (markupLanguage, markup, options) => {
		const conv = markupLanguageUtils.newMarkupToHtml({}, {
			resourceBaseUrl: `file://${Setting.value('resourceDir')}/`,
			customCss: '',
		});
		return conv.render(markupLanguage, markup, {}, options);
	};

	const htmlToMd: HtmlToMarkdownHandler = async (_markupLanguage, html, _originalCss) => {
		const conv = new HtmlToMd();
		return conv.parse(html);
	};

	return { markupToHtml, htmlToMd };
};

describe('resourceHandling', () => {
	it('should sanitize pasted HTML', async () => {
		Setting.setConstant('resourceDir', '/home/.config/joplin/resources');

		const testCases = [
			['Test: <style onload="evil()"></style>', 'Test: <style></style>'],
			['<a href="javascript: alert()">test</a>', '<a href="#">test</a>'],
			['<a href="file:///home/.config/joplin/resources/test.pdf">test</a>', '<a href="file:///home/.config/joplin/resources/test.pdf">test</a>'],
			['<a href="file:///etc/passwd">evil.pdf</a>', '<a href="#">evil.pdf</a>'],
			['<script >evil()</script>', ''],
			['<script>evil()</script>', ''],
			[
				'<img onload="document.body.innerHTML = evil;" src="data:image/svg+xml;base64,=="/>',
				'<img src="data:image/svg+xml;base64,=="/>',
			],
		];

		for (const [html, expected] of testCases) {
			expect(await processPastedHtml(html, null, null)).toBe(expected);
		}
	});

	it('should clean up pasted HTML', async () => {
		const { markupToHtml, htmlToMd } = createTestMarkupConverters();

		const testCases = [
			['<p style="background-color: red">Hello</p><p style="display: hidden;">World</p>', '<p>Hello</p>\n<p>World</p>\n'],
			['', ''],
		];

		for (const [html, expected] of testCases) {
			expect(await processPastedHtml(html, htmlToMd, markupToHtml)).toBe(expected);
		}
	});

	it('should preserve images pasted from the resource directory', async () => {
		const { markupToHtml, htmlToMd } = createTestMarkupConverters();

		// All images in the resource directory should be preserved.
		const html = `<img src="file://${encodeURI(Setting.value('resourceDir'))}/resource.png" alt="test"/>`;
		expect(await processPastedHtml(html, htmlToMd, markupToHtml)).toBe(html);
	});
});
