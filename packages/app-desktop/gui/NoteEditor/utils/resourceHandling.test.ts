import Setting from '@joplin/lib/models/Setting';
import { processPastedHtml, sanitizeGoogleDocsHtml } from './resourceHandling';
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

	const googleDocsWrap = (inner: string) =>
		`<b id="docs-internal-guid-abc123" style="font-weight:normal">${inner}</b>`;

	it('should remove empty inline formatting tags', () => {
		const html = `${googleDocsWrap('<span>Hello</span>')}<b style="font-weight:normal"></b>`;
		const result = sanitizeGoogleDocsHtml(html);
		expect(result).not.toContain('<b style="font-weight:normal"></b>');
		expect(result).toContain('Hello');
	});

	it('should remove empty <b> tags containing only empty spans', () => {
		const html = `${googleDocsWrap('<span>Hi</span>')}<b><span></span></b>`;
		const result = sanitizeGoogleDocsHtml(html);
		expect(result).not.toContain('<b><span></span></b>');
	});

	it('should unwrap fake-bold <b style="font-weight:normal"> with content', () => {
		const html = googleDocsWrap('<span style="font-size:11pt">Some text</span>');
		const result = sanitizeGoogleDocsHtml(html);
		// The <b> wrapper should be removed, but the span content preserved.
		expect(result).not.toMatch(/<b[^>]*>/);
		expect(result).toContain('Some text');
	});

	it('should normalize top-level <br> into <p> blocks', () => {
		const html = `${googleDocsWrap('<span>Line A</span>')}<br><span>Line B</span>`;
		const result = sanitizeGoogleDocsHtml(html);
		expect(result).toContain('<p>');
		expect(result).not.toMatch(/<br\s*\/?>/i);
		expect(result).toContain('Line A');
		expect(result).toContain('Line B');
	});

	it('should NOT normalize <br> inside <li>', () => {
		const html = googleDocsWrap('<ul><li>Line1<br>Line2</li></ul>');
		const result = sanitizeGoogleDocsHtml(html);
		// <br> inside <li> should be preserved.
		expect(result).toContain('<br>');
	});

	it('should split <p> containing <br> into multiple <p> blocks', () => {
		const html = '<b id="docs-internal-guid-abc123" style="font-weight:normal">' +
			'<p><span>Line one</span><br><span>Line two</span><br><span>Line three</span></p></b>';
		const result = sanitizeGoogleDocsHtml(html);
		expect(result).not.toMatch(/<br\s*\/?>/i);
		expect(result).toContain('Line one');
		expect(result).toContain('Line two');
		expect(result).toContain('Line three');
		expect((result.match(/<p>/g) || []).length).toBeGreaterThanOrEqual(3);
	});

	it('should handle trailing <br> inside <p>', () => {
		const html = '<b id="docs-internal-guid-abc123" style="font-weight:normal">' +
			'<p><span>Line 1</span><br><span>Line 2</span><br><span>Line 3</span><br></p></b>';
		const result = sanitizeGoogleDocsHtml(html);
		expect(result).not.toMatch(/<br\s*\/?>/i);
		expect(result).toContain('Line 1');
		expect(result).toContain('Line 2');
		expect(result).toContain('Line 3');
	});

	it('should unwrap <br> from <span> wrappers (real Google Docs format)', () => {
		const html = '<b id="docs-internal-guid-abc123" style="font-weight:normal">' +
			'<p>' +
			'<span style="font-size:11pt">Line 1</span>' +
			'<span style="font-size:11pt"><br></span>' +
			'<span style="font-size:11pt">Line 2</span>' +
			'<span style="font-size:11pt"><br></span>' +
			'<span style="font-size:11pt">Line 3</span>' +
			'<span style="font-size:11pt"><br><br></span>' +
			'</p></b>';
		const result = sanitizeGoogleDocsHtml(html);
		expect(result).not.toMatch(/<br\s*\/?>/i);
		expect(result).toContain('Line 1');
		expect(result).toContain('Line 2');
		expect(result).toContain('Line 3');
		expect((result.match(/<p>/g) || []).length).toBeGreaterThanOrEqual(3);
	});

	it('should handle <br> between and after <p> blocks', () => {
		// <br> after <p> at body level
		const html = '<b id="docs-internal-guid-abc123" style="font-weight:normal">' +
			'<p><span>Line 1</span></p><br><p><span>Line 2</span></p><br></b>';
		const result = sanitizeGoogleDocsHtml(html);
		expect(result).not.toMatch(/<br\s*\/?>/i);
		expect(result).toContain('Line 1');
		expect(result).toContain('Line 2');
	});

	it('should handle Google Docs structure with empty paragraph breaks', () => {
		const html = '<b id="docs-internal-guid-xyz" style="font-weight:normal">' +
			'<p><span>Line one</span><br><span>Line 2</span><br><span>Line 3</span></p>' +
			'<p><br></p>' +
			'<p><span>Hello</span>&nbsp;&nbsp;<span>World</span></p></b>';
		const result = sanitizeGoogleDocsHtml(html);
		expect(result).not.toMatch(/<br\s*\/?>/i);
		expect(result).toContain('Line one');
		expect(result).toContain('Hello');
		expect(result).toContain('World');
	});

	it('should NOT touch content when <p> blocks already exist', () => {
		const html = '<b id="docs-internal-guid-xyz" style="font-weight:normal">' +
			'<p>Para 1</p><br><p>Para 2</p></b>';
		const result = sanitizeGoogleDocsHtml(html);
		// Existing <p> blocks should be preserved as-is.
		expect(result).toContain('<p>Para 1</p>');
		expect(result).toContain('<p>Para 2</p>');
		// The <br> between <p> blocks should be removed.
		expect(result).not.toMatch(/<br\s*\/?>/i);
	});

	it('should return non-Google Docs HTML unchanged', () => {
		const html = '<b></b><span>Hello</span><br><span>World</span>';
		const result = sanitizeGoogleDocsHtml(html);
		expect(result).toBe(html);
	});

	it('end-to-end: Google Docs paste produces clean Markdown with all content preserved', async () => {
		const { markupToHtml, htmlToMd } = createTestMarkupConverters();

		const googleDocsInput =
			'<b id="docs-internal-guid-abc123" style="font-weight:normal">' +
			'<p><span style="font-size:11pt">Hello World</span></p>' +
			'<p><span style="font-size:11pt">Line one</span><br>' +
			'<span style="font-size:11pt">Line two</span><br>' +
			'<span style="font-size:11pt">Line three</span></p>' +
			'</b>' +
			'<b style="font-weight:normal"></b>';

		const result = await processPastedHtml(googleDocsInput, htmlToMd, markupToHtml);

		// Req 1: Text content is preserved exactly
		expect(result).toContain('Hello World');
		expect(result).toContain('Line one');
		expect(result).toContain('Line two');
		expect(result).toContain('Line three');

		// Req 2: Paragraph breaks are preserved
		expect((result.match(/<p>/g) || []).length).toBeGreaterThanOrEqual(4);

		// Req 3: No stray ** lines appear
		expect(result).not.toMatch(/^\*\*$/m);
		expect(result).not.toContain('****');

		// Req 4: No injected formatting markup
		expect(result).not.toMatch(/<br\s*\/?>/i);

		// Req 5: No &nbsp; entities from Google Docs
		expect(result).not.toContain('&nbsp;');
	});
});
