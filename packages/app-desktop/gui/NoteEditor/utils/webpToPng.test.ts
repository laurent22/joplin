import * as fs from 'fs-extra';
import webpToPng from './webpToPng';

jest.mock('fs-extra', () => ({
	readFile: jest.fn(),
}));

describe('webpToPng', () => {
	it('should convert a WebP file to PNG bytes', async () => {
		const webp = Buffer.from('webp-data');
		const png = Uint8Array.from([1, 2, 3]);
		const image = {
			naturalHeight: 480,
			naturalWidth: 640,
			onerror: null as null | (()=> void),
			onload: null as null | (()=> void),
			set src(value: string) {
				expect(value).toBe(`data:image/webp;base64,${webp.toString('base64')}`);
				this.onload();
			},
		};
		const context = {
			drawImage: jest.fn(),
		};
		const canvas = {
			getContext: jest.fn(() => context),
			height: 0,
			toBlob: jest.fn(callback => {
				callback({
					arrayBuffer: async () => png.buffer,
				});
			}),
			width: 0,
		};

		(fs.readFile as jest.Mock).mockResolvedValue(webp);
		(jest.spyOn(document, 'createElement') as jest.Mock).mockImplementation((tagName: string) => {
			if (tagName === 'img') return image as unknown as HTMLImageElement;
			if (tagName === 'canvas') return canvas as unknown as HTMLCanvasElement;
			throw new Error(`Unexpected element: ${tagName}`);
		});

		await expect(webpToPng('/test/image.webp')).resolves.toEqual(png);
		expect(canvas.width).toBe(image.naturalWidth);
		expect(canvas.height).toBe(image.naturalHeight);
		expect(context.drawImage).toHaveBeenCalledWith(image, 0, 0);
		expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
	});
});
