/** @jest-environment jsdom */
import { Platform } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import pickImageFile from './pickImageFile';

jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));
jest.mock('react-native-image-picker', () => ({ launchImageLibrary: jest.fn() }));

describe('pickImageFile', () => {
	afterEach(() => {
		Platform.OS = 'web';
		jest.mocked(launchImageLibrary).mockReset();
		document.body.replaceChildren();
	});

	it('rejects when the selected file cannot be read', async () => {
		const file = new File(['image'], 'icon.png', { type: 'image/png' });
		Object.defineProperty(file, 'arrayBuffer', { value: jest.fn().mockRejectedValue(new Error('read failed')) });

		const selection = pickImageFile();
		const input = document.querySelector('input[type="file"]') as HTMLInputElement;
		Object.defineProperty(input, 'files', { value: [file] });
		input.dispatchEvent(new Event('change'));

		await expect(selection).rejects.toThrow('read failed');
		expect(input.isConnected).toBe(false);
	});

	it('returns the selected image bytes', async () => {
		const data = new Uint8Array([1, 2, 3]).buffer;
		const file = new File(['image'], 'icon.png', { type: 'image/png' });
		Object.defineProperty(file, 'arrayBuffer', { value: jest.fn().mockResolvedValue(data) });

		const selection = pickImageFile();
		const input = document.querySelector('input[type="file"]') as HTMLInputElement;
		Object.defineProperty(input, 'files', { value: [file] });
		input.dispatchEvent(new Event('change'));

		await expect(selection).resolves.toEqual({ type: 'image/png', fileName: 'icon.png', data });
		expect(input.isConnected).toBe(false);
	});

	it('uses the native photo picker outside web', async () => {
		Platform.OS = 'ios';
		jest.mocked(launchImageLibrary).mockResolvedValue({
			assets: [{ uri: 'file:///tmp/icon.png', type: 'image/png', fileName: 'icon.png' }],
		});

		await expect(pickImageFile()).resolves.toEqual({
			uri: 'file:///tmp/icon.png', type: 'image/png', fileName: 'icon.png',
		});
		expect(launchImageLibrary).toHaveBeenCalledWith({
			mediaType: 'photo', selectionLimit: 1, assetRepresentationMode: 'compatible',
		});
	});
});
