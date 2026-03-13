import Setting from '@joplin/lib/models/Setting';
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

jest.mock('electron', () => ({
	clipboard: {
		has: jest.fn(),
		readBuffer: jest.fn(),
	},
}), { virtual: true });

const mockFsDriver = {
	writeFile: jest.fn().mockResolvedValue(undefined),
	remove: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@joplin/lib/shim', () => ({
	__esModule: true,
	default: {
		attachFileToNoteBody: jest.fn().mockResolvedValue('![](:/fakeResourceId)'),
		fsDriver: () => mockFsDriver,
	},
}));

jest.mock('../../../services/bridge', () => ({
	__esModule: true,
	default: () => ({
		showErrorMessageBox: jest.fn(),
		showOpenDialog: jest.fn(),
	}),
}));

const getResourceHandling = () => require('./resourceHandling');

describe('resourceHandling', () => {
	type MockClipboard = {
		has: jest.Mock<boolean, [format: string]>;
		readBuffer: jest.Mock<Buffer, [format: string]>;
	};
	const clipboard = (): MockClipboard => require('electron').clipboard as MockClipboard;

	let processPastedHtml: typeof import('./resourceHandling').processPastedHtml;
	let getResourcesFromPasteEvent: typeof import('./resourceHandling').getResourcesFromPasteEvent;

	beforeAll(() => {
		const rh = getResourceHandling();
		processPastedHtml = rh.processPastedHtml;
		getResourcesFromPasteEvent = rh.getResourcesFromPasteEvent;
	});

	beforeEach(() => {
		jest.clearAllMocks();
		mockFsDriver.writeFile.mockResolvedValue(undefined);
		mockFsDriver.remove.mockResolvedValue(undefined);
	});

	it('should sanitize pasted HTML', async () => {
		Setting.setConstant('resourceDir', '/home/.config/joplin/resources');

		const testCases = [
			['Test: <style onload="evil()"></style>', 'Test: <style></style>'],
			['<a href="javascript: alert()">test</a>', '<a href="#">test</a>'],
			['<a href="file:///home/.config/joplin/resources/test.pdf">test</a>', '<a href="file:///home/.config/joplin/resources/test.pdf">test</a>'],
			['<a href="file:///etc/passwd">evil.pdf</a>', '<a href="#">evil.pdf</a>'],
			['<script >evil()</script>', ''],
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

		const html = `<img src="file://${encodeURI(Setting.value('resourceDir'))}/resource.png" alt="test"/>`;
		expect(await processPastedHtml(html, htmlToMd, markupToHtml)).toBe(html);
	});

	it('should return empty when clipboard has no image', async () => {
		clipboard().has.mockReturnValue(false);
		expect(await getResourcesFromPasteEvent(null)).toEqual([]);
	});

	it('should return empty when readBuffer returns no data', async () => {
		clipboard().has.mockImplementation((fmt: string) => fmt === 'image/jpeg');
		clipboard().readBuffer.mockReturnValue(Buffer.alloc(0));
		expect(await getResourcesFromPasteEvent(null)).toEqual([]);
	});

	it('should return a resource and call preventDefault when JPEG is in clipboard', async () => {
		Setting.setConstant('tempDir', '/tmp/test');

		const mockJpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
		clipboard().has.mockImplementation((fmt: string) => fmt === 'image/jpeg');
		clipboard().readBuffer.mockReturnValue(mockJpegBuffer);

		const mockEvent = { preventDefault: jest.fn() };
		const result = await getResourcesFromPasteEvent(mockEvent);

		expect(result.length).toBeGreaterThan(0);
		expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
	});
});
