import { getTrashFolderId } from '../../services/trash';
import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import Folder from '../Folder';
import Note from '../Note';
import onFolderDrop from './onFolderDrop';

describe('onFolderDrop', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should drop a note to the trash', async () => {
		const note = await Note.save({});
		const beforeTime = Date.now();
		await onFolderDrop([note.id], [], getTrashFolderId());

		const n = await Note.load(note.id);
		expect(n.deleted_time).toBeGreaterThanOrEqual(beforeTime);
	});

	it('should drop a note in the trash to the root of the trash', async () => {
		const folder = await Folder.save({});
		const note = await Note.save({ parent_id: folder.id });
		const beforeTime = Date.now();
		await Folder.delete(folder.id, { toTrash: true });

		await onFolderDrop([note.id], [], getTrashFolderId());

		const n = await Note.load(note.id);
		expect(n.deleted_time).toBeGreaterThan(beforeTime);
		expect(n.parent_id).toBe('');
	});

	it('should drop a folder in the trash to the root of the trash', async () => {
		const folder1 = await Folder.save({});
		const folder2 = await Folder.save({ parent_id: folder1.id });
		await Folder.delete(folder1.id, { toTrash: true });

		await onFolderDrop([], [folder2.id], getTrashFolderId());

		const f = await Folder.load(folder2.id);
		expect(f.deleted_time).toBeTruthy();
		expect(f.parent_id).toBe('');
	});

	it('should drop a deleted folder to a non-deleted one', async () => {
		const folder1 = await Folder.save({});
		const folder2 = await Folder.save({});
		await Folder.delete(folder2.id, { toTrash: true });

		await onFolderDrop([], [folder2.id], folder1.id);

		const f2 = await Folder.load(folder2.id);
		expect(f2.deleted_time).toBe(0);
		expect(f2.parent_id).toBe(folder1.id);
	});

	it('should drop a deleted note to a non-deleted folder', async () => {
		const folder1 = await Folder.save({});
		const folder2 = await Folder.save({});
		const note1 = await Note.save({ parent_id: folder1.id });
		await Note.delete(note1.id, { toTrash: true });

		await onFolderDrop([note1.id], [], folder2.id);

		const n1 = await Note.load(note1.id);
		expect(n1.deleted_time).toBe(0);
		expect(n1.parent_id).toBe(folder2.id);
	});

	it('should drop a non-deleted folder to the virtual root notebook', async () => {
		const folder1 = await Folder.save({});
		const folder2 = await Folder.save({ parent_id: folder1.id });

		await onFolderDrop([], [folder2.id], '');

		const folder2Reloaded = await Folder.load(folder2.id);
		expect(folder2Reloaded.parent_id).toBe(folder1.parent_id);
		expect(folder2Reloaded.parent_id).toBe('');
	});

	it('should drop a deleted folder to the virtual root notebook', async () => {
		const folder1 = await Folder.save({});
		await Folder.delete(folder1.id, { toTrash: true });

		await onFolderDrop([], [folder1.id], '');

		const folder1Reloaded = await Folder.load(folder1.id);
		expect(folder1Reloaded.parent_id).toBe('');
		expect(folder1Reloaded.deleted_time).toBe(0);
	});
});
