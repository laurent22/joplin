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
		const folder2 = await Folder.save({ parent_id: folder1.id });
		const note1 = await Note.save({ parent_id: folder2.id });
		const note2 = await Note.save({ parent_id: folder2.id });

		const beforeTime = Date.now();
		await Folder.delete(folder1.id, { toTrash: true, deleteChildren: true });

		expect((await Folder.load(folder1.id)).deleted_time).toBeGreaterThanOrEqual(beforeTime);
		expect((await Folder.load(folder2.id)).deleted_time).toBeGreaterThanOrEqual(beforeTime);
		expect((await Note.load(note1.id)).deleted_time).toBeGreaterThanOrEqual(beforeTime);
		expect((await Note.load(note2.id)).deleted_time).toBeGreaterThanOrEqual(beforeTime);

		await restoreItems(ModelType.Folder, [await Folder.load(folder1.id)]);

		expect((await Folder.load(folder1.id)).deleted_time).toBe(0);
		expect((await Folder.load(folder2.id)).deleted_time).toBe(0);
		expect((await Note.load(note1.id)).deleted_time).toBe(0);
		expect((await Note.load(note2.id)).deleted_time).toBe(0);
	});

	it('should restore a note, even if the parent folder no longer exists', async () => {
		const folder = await Folder.save({});
		const note = await Note.save({ parent_id: folder.id });

		await Folder.delete(folder.id, { toTrash: true });

		await restoreItems(ModelType.Note, [await Note.load(note.id)]);

		const noteReloaded = await Note.load(note.id);
		expect(noteReloaded.parent_id).toBe('');
	});

	it('should restore a folder, even if the parent folder no longer exists', async () => {
		const folder1 = await Folder.save({});
		const folder2 = await Folder.save({});
		const note = await Note.save({ parent_id: folder2.id });

		await Folder.delete(folder1.id, { toTrash: true });

		await restoreItems(ModelType.Note, [await Folder.load(folder2.id)]);

		const folderReloaded2 = await Folder.load(folder2.id);
		const noteReloaded = await Note.load(note.id);
		expect(folderReloaded2.parent_id).toBe('');
		expect(noteReloaded.parent_id).toBe(folderReloaded2.id);
	});

	it('should restore a conflict', async () => {
		const note = await Note.save({ is_conflict: 1, title: 'Test' });
		await Note.delete(note.id, { toTrash: true });

		await restoreItems(ModelType.Note, [await Note.load(note.id)]);

		const noteReloaded = await Note.load(note.id);
		expect(noteReloaded.title).toBe('Test');
		expect(noteReloaded.is_conflict).toBe(1);
		expect(noteReloaded.deleted_time).toBe(0);
	});
});
