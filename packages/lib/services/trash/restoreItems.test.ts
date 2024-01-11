import { ModelType } from '../../BaseModel';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import restoreItems from './restoreItems';

describe('restoreItems', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should restore notes', async () => {
		const folder = await Folder.save({});
		const note1 = await Note.save({ parent_id: folder.id });
		const note2 = await Note.save({ parent_id: folder.id });
		await Note.delete(note1.id, { toTrash: true });
		await Note.delete(note2.id, { toTrash: true });

		expect((await Folder.noteIds(folder.id)).length).toBe(0);

		await restoreItems(ModelType.Note, [await Note.load(note1.id), await Note.load(note2.id)]);

		expect((await Folder.noteIds(folder.id)).length).toBe(2);
	});

	it('should restore folders and included notes', async () => {
		const folder1 = await Folder.save({});
		const note1 = await Note.save({ parent_id: folder1.id });
		const note2 = await Note.save({ parent_id: folder1.id });

		await Folder.delete(folder1.id, { toTrash: true });

		await restoreItems(ModelType.Folder, [await Folder.load(folder1.id)]);

		expect((await Folder.load(folder1.id)).deleted_time).toBe(0);
		expect((await Note.load(note1.id)).deleted_time).toBe(0);
		expect((await Note.load(note2.id)).deleted_time).toBe(0);
	});

	it('should restore folders and sub-folders', async () => {
		const folder1 = await Folder.save({});
		const folder2 = await Folder.save({});
		const note1 = await Note.save({ parent_id: folder2.id });
		const note2 = await Note.save({ parent_id: folder2.id });

		await Folder.delete(folder1.id, { toTrash: true });

		await restoreItems(ModelType.Folder, [await Folder.load(folder1.id)]);

		expect((await Folder.load(folder1.id)).deleted_time).toBe(0);
		expect((await Folder.load(folder2.id)).deleted_time).toBe(0);
		expect((await Note.load(note1.id)).deleted_time).toBe(0);
		expect((await Note.load(note2.id)).deleted_time).toBe(0);
	});

});
