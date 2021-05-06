import { setupDatabaseAndSynchronizer, switchClient, createFolderTree } from './test-utils';
import Folder from '@joplin/lib/models/Folder';
import { allNotesFolders } from './test-utils-synchronizer';

describe('models_Folder.sharing', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should apply the share ID to all children', (async () => {
		const folder = await createFolderTree('', [
			{
				title: 'folder 1',
				children: [
					{
						title: 'note 1',
					},
					{
						title: 'note 2',
					},
					{
						title: 'folder 2',
						children: [
							{
								title: 'note 3',
							},
						],
					},
				],
			},
		]);

		await Folder.setShareStatus(folder.id, 'abcd1234');

		const allItems = await allNotesFolders();
		for (const item of allItems) {
			expect(item.share_id).toBe('abcd1234');
		}
	}));

});
