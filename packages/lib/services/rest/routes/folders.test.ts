import Note from '../../../models/Note';
import Api, { RequestMethod } from '../Api';
import { setupDatabase, switchClient } from '../../../testing/test-utils';
import Folder from '../../../models/Folder';

describe('routes/folders', () => {

	beforeEach(async () => {
		await setupDatabase(1);
		await switchClient(1);
	});

	test('should not include deleted folders in GET call', async () => {
		const api = new Api();
		const folder1 = await Folder.save({});
		const folder2 = await Folder.save({});
		await api.route(RequestMethod.DELETE, `folders/${folder1.id}`);

		const tree = await api.route(RequestMethod.GET, 'folders', { as_tree: 1 });
		expect(tree.length).toBe(1);
		expect(tree[0].id).toBe(folder2.id);

		const page = await api.route(RequestMethod.GET, 'folders');
		expect(page.items.length).toBe(1);
		expect(page.items[0].id).toBe(folder2.id);
	});

	test('should not include deleted folders in GET folders/:id/notes call', async () => {
		const api = new Api();
		const folder = await Folder.save({});
		const note1 = await Note.save({ parent_id: folder.id });
		const note2 = await Note.save({ parent_id: folder.id });

		{
			const notes = await api.route(RequestMethod.GET, `folders/${folder.id}/notes`);
			expect(notes.items.length).toBe(2);
		}

		await Note.delete(note1.id, { toTrash: true });

		{
			const notes = await api.route(RequestMethod.GET, `folders/${folder.id}/notes`);
			expect(notes.items.length).toBe(1);
			expect(notes.items[0].id).toBe(note2.id);
		}

		// const tree = await api.route(RequestMethod.GET, 'folders', { as_tree: 1 });
		// expect(tree.length).toBe(1);
		// expect(tree[0].id).toBe(folder2.id);

		// const page = await api.route(RequestMethod.GET, 'folders');
		// expect(page.items.length).toBe(1);
		// expect(page.items[0].id).toBe(folder2.id);
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
