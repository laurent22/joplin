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

	it('should normalize HTML-encoded newlines in image alt attributes', async () => {
		// Word encodes newlines in alt text as &#10; HTML entities. These must be
		// normalized to spaces before Turndown processes the HTML, otherwise
		// node.outerHTML (returned verbatim for images with width/height) embeds
		// literal newlines that break Markdown raw HTML block parsing.
		const resourceSrc = `file://${encodeURI(Setting.value('resourceDir'))}/resource.png`;
		const testCases: [string, string][] = [
			// HTML entity newlines (Word clipboard format: &#10; = LF)
			[
				`<img src="${resourceSrc}" alt="A screenshot&#10;&#10;AI-generated content."/>`,
				`<img src="${resourceSrc}" alt="A screenshot AI-generated content."/>`,
			],
			// Literal newlines in the raw HTML attribute value
			[
				`<img src="${resourceSrc}" alt="hello\nworld"/>`,
				`<img src="${resourceSrc}" alt="hello world"/>`,
			],
		];

		for (const [html, expected] of testCases) {
			expect(await processPastedHtml(html, null, null)).toBe(expected);
		}
	});

	it('should render Word-pasted images with newlines in alt as img elements, not broken text', async () => {
		// When Word pastes an image with width/height attributes and &#10; in the alt,
		// Turndown returns node.outerHTML verbatim (preserveImageTagsWithSize=true).
		// Without normalization, literal newlines inside the Markdown raw HTML block
		// would terminate the block early, causing the <img> to render as plain text.
		const { markupToHtml, htmlToMd } = createTestMarkupConverters();
		const resourceSrc = `file://${encodeURI(Setting.value('resourceDir'))}/resource.png`;

		const testCases = [
			// Word-style: width/height present, alt has &#10; entities
			`<img width="625" height="284" src="${resourceSrc}" alt="A screenshot&#10;&#10;AI-generated content."/>`,
			// Multiple consecutive newline entities collapsed to single space
			`<img width="100" height="100" src="${resourceSrc}" alt="line1&#10;&#13;&#10;line2"/>`,
		];

		for (const html of testCases) {
			const result = await processPastedHtml(html, htmlToMd, markupToHtml);
			// The image must be rendered as an <img> element, not as escaped/broken text
			expect(result).toContain('<img');
			// The alt text after normalization must not contain literal newlines
			expect(result).not.toMatch(/alt="[^"]*\n/);
		}
	});
});
