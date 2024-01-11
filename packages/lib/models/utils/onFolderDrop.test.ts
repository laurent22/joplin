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

});
