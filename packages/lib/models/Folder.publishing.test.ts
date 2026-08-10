import { setupDatabaseAndSynchronizer, switchClient, resourceService, createFolderTree } from '../testing/test-utils';
import Folder from '../models/Folder';
import { ShareType, StateShare } from '../services/share/reducer';
import BaseItem from './BaseItem';
import Note from './Note';

const publishedFolderShareState = (folderId: string): StateShare => ({
	id: `share-${folderId}`,
	type: ShareType.PublishedFolder,
	folder_id: folderId,
	note_id: '',
	master_key_id: '',
});

const expectPublished = async (id: string, published = true) => {
	expect(await BaseItem.loadItemsByIds([id])).toMatchObject([{
		is_shared: published ? 1 : 0,
	}]);
};

const expectUnpublished = (id: string) => expectPublished(id, false);

describe('models/Folder.publishing', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should set is_shared=1 for descendants of a published folder', async () => {
		const root = await createFolderTree('', [
			{
				title: 'root',
				children: [
					{
						title: 'sub-folder 1',
						children: [],
					},
					{
						title: 'sub-folder 2',
						children: [
							{ title: 'sub-sub-folder', children: [] },
							{ title: 'published note 1' },
							{ title: 'published note 2' },
						],
					},
					{ title: 'published note 3' },
				],
			},
			{
				title: 'unpublished folder',
				children: [
					{ title: 'unpublished note' },
				],
			},
		]);

		const shareState: StateShare[] = [
			publishedFolderShareState(root.id),
		];

		await Folder.updateAllShareIds(
			resourceService(),
			shareState,
		);

		for (const title of [
			'root',
			'sub-folder 1',
			'sub-folder 2',
			'sub-sub-folder',
		]) {
			const id = (await Folder.loadByTitle(title)).id;
			await expectPublished(id);
		}
		for (const title of [
			'published note 1',
			'published note 2',
			'published note 3',
		]) {
			const id = (await Note.loadByTitle(title)).id;
			await expectPublished(id);
		}

		// Items that are not descendants of root should not be published
		await expectUnpublished((await Folder.loadByTitle('unpublished folder')).id);
		await expectUnpublished((await Note.loadByTitle('unpublished note')).id);
	});
});
