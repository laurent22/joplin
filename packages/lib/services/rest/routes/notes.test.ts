import Logger from '@joplin/utils/Logger';
import shim from '../../../shim';
import uuid from '../../../uuid';
import { downloadMediaFile } from './notes';
import Note from '../../../models/Note';
import Api, { RequestMethod } from '../Api';
import { setupDatabase, switchClient } from '../../../testing/test-utils';

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
		const fetchBlobSpy = jest.fn();
		const spy1 = jest.spyOn(shim, 'fetchBlob').mockImplementation(fetchBlobSpy);
		const spy2 = jest.spyOn(uuid, 'create').mockReturnValue('mocked_uuid_value');

		const response = await downloadMediaFile(url);

		expect(response.endsWith('mocked_uuid_value.png')).toBe(true);
		expect(fetchBlobSpy).toBeCalledTimes(1);

		spy1.mockRestore();
		spy2.mockRestore();
	});

	test('should get file from local drive if protocol allows it', async () => {
		const url = 'file://valid/image.png';

		const fsDriverCopySpy = jest.fn();
		const spy1 = jest.spyOn(shim, 'fsDriver').mockImplementation(() => {
			return {
				copy: fsDriverCopySpy,
			} as any;
		});
		const spy2 = jest.spyOn(uuid, 'create').mockReturnValue('mocked_uuid_value');

		const response = await downloadMediaFile(url);

		expect(response.endsWith('mocked_uuid_value.png')).toBe(true);
		expect(fsDriverCopySpy).toBeCalledTimes(1);

		spy1.mockRestore();
		spy2.mockRestore();
	});

	test('should be able to handle URLs with data', async () => {
		const url = 'data:image/gif;base64,R0lGODlhEAAQAMQAAORHHOVSKudfOulrSOp3WOyDZu6QdvCchPGolfO0o/XBs/fNwfjZ0frl3/zy7////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAkAABAALAAAAAAQABAAAAVVICSOZGlCQAosJ6mu7fiyZeKqNKToQGDsM8hBADgUXoGAiqhSvp5QAnQKGIgUhwFUYLCVDFCrKUE1lBavAViFIDlTImbKC5Gm2hB0SlBCBMQiB0UjIQA7';

		const imageFromDataUrlSpy = jest.fn();
		const spy1 = jest.spyOn(shim, 'imageFromDataUrl').mockImplementation(imageFromDataUrlSpy);
		const spy2 = jest.spyOn(uuid, 'create').mockReturnValue('mocked_uuid_value');

		const response = await downloadMediaFile(url);

		expect(response.endsWith('mocked_uuid_value.gif')).toBe(true);
		expect(imageFromDataUrlSpy).toBeCalledTimes(1);

		spy1.mockRestore();
		spy2.mockRestore();
	});

	test('should not process URLs with data that is not image type', async () => {
		const url = 'data:application/octet-stream;base64,dGhpcyBpcyBhIG1lc3NhZ2UK';

		Logger.globalLogger.enabled = false;
		const response = await downloadMediaFile(url);
		Logger.globalLogger.enabled = true;

		expect(response).toBe('');
	});

	test('should not process URLs from cid: protocol', async () => {
		const url = 'cid:ii_loq3d1100';

		const response = await downloadMediaFile(url);

		expect(response).toBe('');
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
});
