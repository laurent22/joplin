import Logger from '@joplin/utils/Logger';
import shim from '../../../shim';
import { downloadMediaFile, createResourcesFromPaths } from './notes';
import Setting from '../../../models/Setting';
import { readFile, readdir, remove, writeFile } from 'fs-extra';
import Resource from '../../../models/Resource';
import Api, { RequestMethod } from '../Api';
import Note from '../../../models/Note';
import { setupDatabase, switchClient } from '../../../testing/test-utils';
const md5 = require('md5');

const imagePath = `${__dirname}/../../../images/SideMenuHeader.png`;
const jpgBase64Content = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/wAALCAAFAAUBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EAB8QAAEEAQUBAAAAAAAAAAAAAAQBAgUGAwAREiExM//aAAgBAQAAPwBJarVpGHm7KWbapCSwyZ6FDjkLyYE1W/LHyV2zfOk2TrzX/9k=';

describe('routes/notes', () => {

	beforeEach(async () => {
		jest.resetAllMocks();
		await setupDatabase(1);
		await switchClient(1);
	});

	test.each([
		'/invalid/url',
		'htp/asdfasf.com',
		'https//joplinapp.org',
	])('should not return a local file for invalid protocols', async (invalidUrl) => {
		expect(await downloadMediaFile(invalidUrl)).toBe('');
	});

	test.each([
		'https://joplinapp.org/valid/image_url.png',
		'http://joplinapp.org/valid/image_url.png',
	])('should try to download and return a local path to a valid URL', async (url) => {
		const fetchBlobSpy = jest.fn(async (_url, options) => {
			await writeFile(options.path, Buffer.from(jpgBase64Content, 'base64'));
		});
		const spy = jest.spyOn(shim, 'fetchBlob').mockImplementation(fetchBlobSpy);

		const response = await downloadMediaFile(url);

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

		const response = await downloadMediaFile(url, null, ['file:']);

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

		const response = await downloadMediaFile(url);

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
	])('should correct the file extension in filename from files without or invalid ones', async (url) => {
		const spy = jest.spyOn(shim, 'fetchBlob').mockImplementation(async (_url, options) => {
			await writeFile(options.path, Buffer.from(jpgBase64Content, 'base64'));
			return {
				headers: {
					'content-type': 'image/jpg',
				},
			};
		});

		const response = await downloadMediaFile(url);

		const files = await readdir(Setting.value('tempDir'));
		expect(files.length).toBe(1);
		expect(response).toBe(`${Setting.value('tempDir')}/${files[0]}`);

		await remove(response);
		spy.mockRestore();
	});

	test('should be able to create resource from files in the filesystem', async () => {
		const result = await createResourcesFromPaths([
			{ originalUrl: 'asdf.png', path: `${__dirname}/../../../images/SideMenuHeader.png` },
		]);

		const resources = await Resource.all();

		expect(result.length).toBe(1);
		expect(result[0].originalUrl).toBe('asdf.png');
		expect(result[0].path).toBe(`${__dirname}/../../../images/SideMenuHeader.png`);
		expect(result[0].resource.title).toBe('SideMenuHeader.png');
		expect(result[0].resource.file_extension).toBe('png');
		expect(resources.length).toBe(1);
		expect(result[0].resource).toEqual(resources[0]);
	});

	test('should not create resource from files that does not exist', async () => {
		Logger.globalLogger.enabled = false;
		const result = await createResourcesFromPaths([
			{ originalUrl: 'not-a-real-file', path: '/does/not/exist' },
		]);
		Logger.globalLogger.enabled = true;

		expect(result[0].resource).toBe(null);
		const resources = await Resource.all();
		expect(resources.length).toBe(0);
	});

	test('should be able to delete to trash', async () => {
		const api = new Api();
		const note1 = await Note.save({});
		const note2 = await Note.save({});
		const beforeTime = Date.now();
		await api.route(RequestMethod.DELETE, `notes/${note1.id}`);
		await api.route(RequestMethod.DELETE, `notes/${note2.id}`, { permanent: '1' });

		expect((await Note.load(note1.id)).deleted_time).toBeGreaterThanOrEqual(beforeTime);
		expect(await Note.load(note2.id)).toBeFalsy();
	});

	test('should not stop execution if a file can not be processed', async () => {
		Logger.globalLogger.enabled = false;
		const result = await createResourcesFromPaths([
			{ originalUrl: 'asdf.png', path: `${__dirname}/bad-path-should-not-exist` },
			{ originalUrl: 'asdf.png', path: `${__dirname}/../../../images/SideMenuHeader.png` },
		]);
		Logger.globalLogger.enabled = true;

		expect(result.length).toBe(2);
	});

	test('should not return notes in the trash by default', async () => {
		const api = new Api();
		const note1 = await Note.save({});
		const note2 = await Note.save({});
		await Note.delete(note1.id, { toTrash: true });

		{
			const notes = await api.route(RequestMethod.GET, 'notes');
			expect(notes.items.length).toBe(1);
			expect(notes.items[0].id).toBe(note2.id);
		}

		{
			const notes = await api.route(RequestMethod.GET, 'notes', { include_deleted: '1' });
			expect(notes.items.length).toBe(2);
		}
	});

	test('should not return conflicts by default', async () => {
		const api = new Api();
		const note1 = await Note.save({});
		await Note.save({ is_conflict: 1 });

		{
			const notes = await api.route(RequestMethod.GET, 'notes');
			expect(notes.items.length).toBe(1);
			expect(notes.items[0].id).toBe(note1.id);
		}

		{
			const notes = await api.route(RequestMethod.GET, 'notes', { include_conflicts: '1' });
			expect(notes.items.length).toBe(2);
		}
	});

});
