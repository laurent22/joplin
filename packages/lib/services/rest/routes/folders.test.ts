import Note from '../../../models/Note';
import Api, { RequestMethod } from '../Api';
import { setupDatabase, switchClient } from '../../../testing/test-utils';
import Folder from '../../../models/Folder';

describe('routes/folders', () => {

	beforeEach(async () => {
		await setupDatabase(1);
		await switchClient(1);
	});

	test('should be able to delete to trash', async () => {
		const api = new Api();
		const folder1 = await Folder.save({});
		const folder2 = await Folder.save({});
		const note1 = await Note.save({ parent_id: folder1.id });
		const note2 = await Note.save({ parent_id: folder2.id });
		const beforeTime = Date.now();
		await api.route(RequestMethod.DELETE, `folders/${folder1.id}`);
		await api.route(RequestMethod.DELETE, `folders/${folder2.id}`, { permanent: '1' });

		expect((await Folder.load(folder1.id)).deleted_time).toBeGreaterThanOrEqual(beforeTime);
		expect(await Folder.load(folder2.id)).toBeFalsy();
		expect((await Note.load(note1.id)).deleted_time).toBeGreaterThanOrEqual(beforeTime);
		expect(await Note.load(note2.id)).toBeFalsy();
	});
});
