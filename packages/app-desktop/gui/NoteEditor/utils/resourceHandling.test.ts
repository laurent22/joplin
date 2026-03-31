import Setting from '@joplin/lib/models/Setting';
import { processImagesInPastedHtml, processPastedHtml, getResourcesFromPasteEvent } from './resourceHandling';
import markupLanguageUtils from '@joplin/lib/markupLanguageUtils';
import HtmlToMd from '@joplin/lib/HtmlToMd';
import { HtmlToMarkdownHandler, MarkupToHtmlHandler } from './types';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';

jest.mock('electron', () => ({
	clipboard: {
		has: jest.fn(),
		readBuffer: jest.fn(),
	},
}));

interface ClipboardMock {
	has: jest.Mock;
	readBuffer: jest.Mock;
}

const mockClipboard = (require('electron') as { clipboard: ClipboardMock }).clipboard;

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
	afterEach(() => {
		mockClipboard.has.mockReset();
		mockClipboard.readBuffer.mockReset();
	});

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

	// Regression test: base64 branch was hardcoding file:// and ignoring useInternalUrls
	// 1x1 transparent PNG — smallest valid base64-encoded image for testing
	const minimalPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

	test.each([
		{ useInternalUrls: true, expectMatch: /src=":\/[a-f0-9]+"/, expectAbsent: 'file://' },
		{ useInternalUrls: false, expectMatch: /src="file:\/\//, expectAbsent: 'data:' },
	])('should convert base64 image using resourceUrl (useInternalUrls=$useInternalUrls)', async ({ useInternalUrls, expectMatch, expectAbsent }) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		const html = `<img src="data:image/png;base64,${minimalPng}"/>`;
		const result = await processImagesInPastedHtml(html, { useInternalUrls });
		expect(result).toMatch(expectMatch);
		expect(result).not.toContain(expectAbsent);
		expect(result).not.toContain('data:');
	});

	// Tests for getResourcesFromPasteEvent - clipboard image paste (issue #14613)
	// The test environment (non-Electron, no sharp) skips image validation and
	// just copies the file, so any non-empty buffer works as test data.
	const testImageBuffer = Buffer.from(minimalPng, 'base64');

	test.each([
		{ format: 'image/jpeg', description: 'JPEG (bug #14613)' },
		{ format: 'image/jpg', description: 'JPG alias' },
		{ format: 'image/png', description: 'PNG (regression check)' },
	])('should paste $description image from clipboard via getResourcesFromPasteEvent', async ({ format }) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		mockClipboard.has.mockImplementation((f: string) => f === format);
		mockClipboard.readBuffer.mockImplementation((f: string) => {
			return f === format ? testImageBuffer : Buffer.alloc(0);
		});
		const mockEvent = { preventDefault: jest.fn() };
		const result = await getResourcesFromPasteEvent(mockEvent);
		expect(result.length).toBe(1);
		expect(result[0]).toContain('](:/');
		expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
	});

	test.each([
		{ description: 'clipboard has no image', hasResult: false },
		{ description: 'buffer is empty despite has() returning true', hasResult: true },
	])('should return empty when $description', async ({ hasResult }) => {
		mockClipboard.has.mockReturnValue(hasResult);
		mockClipboard.readBuffer.mockReturnValue(Buffer.alloc(0));
		const mockEvent = { preventDefault: jest.fn() };
		const result = await getResourcesFromPasteEvent(mockEvent);
		expect(result).toEqual([]);
		expect(mockEvent.preventDefault).not.toHaveBeenCalled();
	});
});
