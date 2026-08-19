import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import Folder from '../Folder';
import getCanBeCollapsedFolderIds from './getCanBeCollapsedFolderIds';

describe('getCanBeCollapsedFolderIds', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should tell if trash can be collapsed too', async () => {
		const folder1 = await Folder.save({});
		await Folder.save({ parent_id: folder1.id });
		await Folder.save({ parent_id: folder1.id });

		const folder2 = await Folder.save({ });
		const folder2a = await Folder.save({ parent_id: folder2.id });
		await Folder.save({ parent_id: folder2a.id });

		expect(getCanBeCollapsedFolderIds(await Folder.all({ includeTrash: true }))).toHaveLength(3);

		await Folder.delete(folder1.id, { toTrash: true, deleteChildren: true });

		expect(getCanBeCollapsedFolderIds(await Folder.all({ includeTrash: true }))).toHaveLength(4);
	});

});
