import InteropService from '@joplin/lib/services/interop/InteropService';
import shim from '@joplin/lib/shim';
import darkTheme from '@joplin/lib/themes/dark';
import InteropServiceHelper from './InteropServiceHelper';
const Color = require('color');

const mockWindow = {
	destroy: jest.fn(),
	loadURL: jest.fn(),
	webContents: {
		executeJavaScript: jest.fn(),
		on: jest.fn(),
		printToPDF: jest.fn(),
	},
};

jest.mock('./services/bridge', () => ({
	__esModule: true,
	default: () => ({ newBrowserWindow: () => mockWindow }),
}));

describe('InteropServiceHelper', () => {
	beforeEach(() => {
		jest.spyOn(InteropService.instance(), 'export').mockResolvedValue({ warnings: [] });
		jest.spyOn(shim, 'setTimeout').mockImplementation(callback => void callback());
		mockWindow.webContents.on.mockImplementation((_event, callback) => callback());
		mockWindow.webContents.executeJavaScript.mockImplementation(script => Promise.resolve(window.eval(script)));
		mockWindow.webContents.printToPDF.mockResolvedValue(Buffer.from('pdf'));
	});

	afterEach(() => {
		document.body.replaceChildren();
		jest.restoreAllMocks();
		jest.clearAllMocks();
	});

	test('should add a dark print background only to valid js-draw images', async () => {
		const drawingSvg = '<svg><style id="js-draw-style-sheet"/><path stroke="#ffffff"/></svg>';
		const otherSvg = '<svg><path stroke="#ffffff"/></svg>';
		const drawingDataUrl = `data:image/svg+xml;base64,${Buffer.from(drawingSvg).toString('base64')}`;
		const otherDataUrl = `data:image/svg+xml;base64,${Buffer.from(otherSvg).toString('base64')}`;
		document.body.innerHTML = `
			<img id="invalid" src="data:image/svg+xml;base64,==">
			<img id="drawing" src="${drawingDataUrl}">
			<img id="other" src="${otherDataUrl}">
		`;

		await InteropServiceHelper.exportNoteToPdf('note-id', { printBackground: true });

		const invalid = document.querySelector<HTMLImageElement>('#invalid');
		const drawing = document.querySelector<HTMLImageElement>('#drawing');
		const other = document.querySelector<HTMLImageElement>('#other');
		expect(invalid.style.backgroundColor).toBe('');
		expect(drawing.src).toBe(drawingDataUrl);
		expect(drawing.style.backgroundColor).toBe(Color(darkTheme.backgroundColor).rgb().string());
		expect(other.src).toBe(otherDataUrl);
		expect(other.style.backgroundColor).toBe('');
	});

	test('should clean up when preparing js-draw images fails', async () => {
		mockWindow.webContents.executeJavaScript.mockRejectedValueOnce(new Error('Preparation failed'));

		await expect(InteropServiceHelper.exportNoteToPdf('note-id', { printBackground: true })).rejects.toThrow('Preparation failed');
		expect(mockWindow.destroy).toHaveBeenCalled();
	});
});
