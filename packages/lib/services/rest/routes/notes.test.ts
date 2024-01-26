import Logger from '@joplin/utils/Logger';
import shim from '../../../shim';
import { downloadMediaFile } from './notes';
import Setting from '../../../models/Setting';
import { readFile, readdir, remove, writeFile } from 'fs-extra';
import { DummyDownloadController } from '../../../downloadController';
const md5 = require('md5');

const imagePath = `${__dirname}/../../../images/SideMenuHeader.png`;
const jpgBase64Content = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/wAALCAAFAAUBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EAB8QAAEEAQUBAAAAAAAAAAAAAAQBAgUGAwAREiExM//aAAgBAQAAPwBJarVpGHm7KWbapCSwyZ6FDjkLyYE1W/LHyV2zfOk2TrzX/9k=';

describe('routes/notes', () => {

	beforeEach(() => {
		jest.resetAllMocks();
	});

	test.each([
		'/invalid/url',
		'htp/asdfasf.com',
		'https//joplinapp.org',
	])('should not return a local file for invalid protocols', async (invalidUrl) => {
		await expect(downloadMediaFile(invalidUrl, new DummyDownloadController())).resolves.toBe('');
	});

	test.each([
		'https://joplinapp.org/valid/image_url.png',
		'http://joplinapp.org/valid/image_url.png',
	])('should try to download and return a local path to a valid URL', async (url) => {
		const fetchBlobSpy = jest.fn(async (_url, options) => {
			await writeFile(options.path, Buffer.from(jpgBase64Content, 'base64'));
		});
		const spy = jest.spyOn(shim, 'fetchBlob').mockImplementation(fetchBlobSpy);

		const response = await downloadMediaFile(url, new DummyDownloadController());

		const files = await readdir(Setting.value('tempDir'));

		expect(files.length).toBe(1);
		expect(fetchBlobSpy).toHaveBeenCalledTimes(1);
		expect(response).toBe(`${Setting.value('tempDir')}/${files[0]}`);
		await remove(response);
		spy.mockRestore();
	});

	test('should get file from local drive if protocol allows it', async () => {
		const url = `file:///${imagePath}`;
		const originalFileContent = await readFile(imagePath);

		const response = await downloadMediaFile(url, new DummyDownloadController(), null, ['file:']);

		const files = await readdir(Setting.value('tempDir'));
		expect(files.length).toBe(1);
		expect(response).toBe(`${Setting.value('tempDir')}/${files[0]}`);

		const responseFileContent = await readFile(response);
		expect(md5(responseFileContent)).toBe(md5(originalFileContent));
		await remove(response);
	});

	test('should be able to handle URLs with data', async () => {
		const url = 'data:image/gif;base64,R0lGODlhEAAQAMQAAORHHOVSKudfOulrSOp3WOyDZu6QdvCchPGolfO0o/XBs/fNwfjZ0frl3/zy7////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAkAABAALAAAAAAQABAAAAVVICSOZGlCQAosJ6mu7fiyZeKqNKToQGDsM8hBADgUXoGAiqhSvp5QAnQKGIgUhwFUYLCVDFCrKUE1lBavAViFIDlTImbKC5Gm2hB0SlBCBMQiB0UjIQA7';
		const originalFileContent = Buffer.from(url.split('data:image/gif;base64,')[1], 'base64');

		const response = await downloadMediaFile(url, new DummyDownloadController());

		const files = await readdir(Setting.value('tempDir'));
		expect(files.length).toBe(1);
		expect(response).toBe(`${Setting.value('tempDir')}/${files[0]}`);

		const responseFileContent = await readFile(response);
		expect(md5(responseFileContent)).toBe(md5(originalFileContent));
		await remove(response);
	});

	test('should not process URLs with data that is not image type', async () => {
		const url = 'data:application/octet-stream;base64,dGhpcyBpcyBhIG1lc3NhZ2UK';

		Logger.globalLogger.enabled = false;
		const response = await downloadMediaFile(url, new DummyDownloadController());
		Logger.globalLogger.enabled = true;

		const files = await readdir(Setting.value('tempDir'));
		expect(files.length).toBe(0);
		expect(response).toBe('');
	});

	test('should not process URLs from cid: protocol', async () => {
		const url = 'cid:ii_loq3d1100';

		const response = await downloadMediaFile(url, new DummyDownloadController());

		const files = await readdir(Setting.value('tempDir'));
		expect(files.length).toBe(0);
		expect(response).toBe('');
	});

	test('should not copy content from invalid protocols', async () => {
		const url = 'file:///home/user/file.db';

		const allowedProtocols: string[] = [];
		const mediaFilePath = await downloadMediaFile(url, new DummyDownloadController(), null, allowedProtocols);

		const files = await readdir(Setting.value('tempDir'));
		expect(files.length).toBe(0);
		expect(mediaFilePath).toBe('');
	});

	test.each([
		'https://joplinapp.org/valid/image_url',
		'https://joplinapp.org/valid/image_url.invalid_url',
	])('should correct the file extension in filename from files without or invalid ones', async (url) => {
		const spy = jest.spyOn(shim, 'fetchBlob').mockImplementation(async (_url, options) => {
			await writeFile(options.path, Buffer.from(jpgBase64Content, 'base64'));
			return {
				headers: {
					'content-type': 'image/jpg',
				},
			};
		});

		const response = await downloadMediaFile(url, new DummyDownloadController());

		const files = await readdir(Setting.value('tempDir'));
		expect(files.length).toBe(1);
		expect(response).toBe(`${Setting.value('tempDir')}/${files[0]}`);

		await remove(response);
		spy.mockRestore();
	});
});
