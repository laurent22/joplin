import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import Folder from '../Folder';
import areAllFoldersCollapsed from './areAllFoldersCollapsed';

describe('areAllFoldersCollapsed', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should tell if all folders are collapsed', async () => {
		const folder1 = await Folder.save({});
		await Folder.save({ parent_id: folder1.id });
		await Folder.save({ parent_id: folder1.id });

		const folder2 = await Folder.save({ });
		const folder2a = await Folder.save({ parent_id: folder2.id });
		await Folder.save({ parent_id: folder2a.id });

		expect(areAllFoldersCollapsed(await Folder.all(), [])).toBe(false);

		expect(areAllFoldersCollapsed(await Folder.all(), [
			folder1.id,
			folder2.id,
		])).toBe(false);

		expect(areAllFoldersCollapsed(await Folder.all(), [
			folder1.id,
			folder2.id,
			folder2a.id,
		])).toBe(true);
	});

});
