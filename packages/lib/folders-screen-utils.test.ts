import { setupDatabaseAndSynchronizer, switchClient } from './testing/test-utils';
import Folder from './models/Folder';
import Setting from './models/Setting';
import { allForDisplay } from './folders-screen-utils';

describe('folders-screen-utils', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should use manual folder order when configured', async () => {
		Setting.setValue('folders.sortOrder.field', 'order');
		Setting.setValue('folders.sortOrder.reverse', false);

		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });

		const folders = await allForDisplay();

		expect(folders.map(folder => folder.id)).toEqual([folder2.id, folder1.id]);
		expect(folder2.order).toBeLessThan(folder1.order);
	});
});
