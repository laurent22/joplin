import Folder from '../../models/Folder';
import Note from '../../models/Note';
import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import emptyTrash from './emptyTrash';

describe('emptyTrash', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should empty the trash', async () => {
		const folder1 = await Folder.save({});
		const folder2 = await Folder.save({ parent_id: folder1.id });
		const folder3 = await Folder.save({});
		await Note.save({ parent_id: folder1.id });
		await Note.save({ parent_id: folder2.id });
		await Note.save({ parent_id: folder3.id });

		await Folder.delete(folder1.id, { toTrash: true });

		await emptyTrash();

		expect(await Folder.count()).toBe(1);
		expect(await Note.count()).toBe(1);
	});

});
