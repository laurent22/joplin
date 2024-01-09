import Logger from '@joplin/utils/Logger';
import shim from '../../../shim';
import uuid from '../../../uuid';
import { downloadMediaFile } from './notes';
import Setting from '../../../models/Setting';
import { readdir, remove } from 'fs-extra';

const imagePath = `${__dirname}/../../../images/SideMenuHeader.png`;

describe('routes/notes', () => {

	beforeEach(() => {
		jest.resetAllMocks();
	});

	test.each([
		'/invalid/url',
		'htp/asdfasf.com',
		'https//joplinapp.org',
	])('should not return a local file for invalid protocols', async (invalidUrl) => {
		await expect(downloadMediaFile(invalidUrl)).resolves.toBe('');
	});

	test.each([
		'https://joplinapp.org/valid/image_url.png',
		'http://joplinapp.org/valid/image_url.png',
	])('should try to download and return a local path to a valid URL', async (url) => {
		const fetchBlobSpy = jest.fn();
		const spy1 = jest.spyOn(shim, 'fetchBlob').mockImplementation(fetchBlobSpy);
		const spy2 = jest.spyOn(uuid, 'create').mockReturnValue('mocked_uuid_value');

		const response = await downloadMediaFile(url);

		expect(response.endsWith('mocked_uuid_value.png')).toBe(true);
		expect(fetchBlobSpy).toHaveBeenCalledTimes(1);
		spy1.mockRestore();
		spy2.mockRestore();
	});

	test('should get file from local drive if protocol allows it', async () => {
		const url = `file:///${imagePath}`;

		const response = await downloadMediaFile(url, null, ['file:']);

		const files = await readdir(Setting.value('tempDir'));
		expect(files.length).toBe(1);
		expect(response).toBe(`${Setting.value('tempDir')}/${files[0]}`);
		await remove(response);
	});

	test('should be able to handle URLs with data', async () => {
		const url = 'data:image/gif;base64,R0lGODlhEAAQAMQAAORHHOVSKudfOulrSOp3WOyDZu6QdvCchPGolfO0o/XBs/fNwfjZ0frl3/zy7////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAkAABAALAAAAAAQABAAAAVVICSOZGlCQAosJ6mu7fiyZeKqNKToQGDsM8hBADgUXoGAiqhSvp5QAnQKGIgUhwFUYLCVDFCrKUE1lBavAViFIDlTImbKC5Gm2hB0SlBCBMQiB0UjIQA7';

		const response = await downloadMediaFile(url);

		const files = await readdir(Setting.value('tempDir'));
		expect(files.length).toBe(1);
		expect(response).toBe(`${Setting.value('tempDir')}/${files[0]}`);
		await remove(response);
	});

	test('should not process URLs with data that is not image type', async () => {
		const url = 'data:application/octet-stream;base64,dGhpcyBpcyBhIG1lc3NhZ2UK';

		Logger.globalLogger.enabled = false;
		const response = await downloadMediaFile(url);
		Logger.globalLogger.enabled = true;

		const files = await readdir(Setting.value('tempDir'));
		expect(files.length).toBe(0);
		expect(response).toBe('');
	});

	test('should not process URLs from cid: protocol', async () => {
		const url = 'cid:ii_loq3d1100';

		const response = await downloadMediaFile(url);

		const files = await readdir(Setting.value('tempDir'));
		expect(files.length).toBe(0);
		expect(response).toBe('');
	});

	test('should not copy content from invalid protocols', async () => {
		const url = 'file:///home/user/file.db';

		const allowedProtocols: string[] = [];
		const mediaFilePath = await downloadMediaFile(url, null, allowedProtocols);

		const files = await readdir(Setting.value('tempDir'));
		expect(files.length).toBe(0);
		expect(mediaFilePath).toBe('');
	});

	test.each([
		'https://joplinapp.org/valid/image_url',
		'https://joplinapp.org/valid/image_url.invalid_url',
	])('should find and move file with invalid or without filename', async (url) => {
		const spy1 = jest.spyOn(shim, 'fetchBlob').mockImplementation(() => {
			return {
				headers: {
					'content-type': 'image/jpg',
				},
			};
		});
		const shimFsDriverMoveSpy = jest.fn();
		const spy2 = jest.spyOn(shim, 'fsDriver').mockImplementation(() => {
			return {
				move: shimFsDriverMoveSpy,
			} as any;
		});

		await downloadMediaFile(url);

		expect(shimFsDriverMoveSpy).toHaveBeenCalledTimes(1);
		spy1.mockRestore();
		spy2.mockRestore();
	});
});
