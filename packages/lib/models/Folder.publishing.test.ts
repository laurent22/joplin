import { setupDatabaseAndSynchronizer, switchClient, resourceService, createFolderTree } from '../testing/test-utils';
import Folder from '../models/Folder';
import { ShareType, StateShare } from '../services/share/reducer';
import Note from './Note';

const publishedFolderShareState = (folderId: string): StateShare => ({
	id: `share-${folderId}`,
	type: ShareType.PublishedFolder,
	folder_id: folderId,
	note_id: '',
	master_key_id: '',
});

type ItemSlice = { title: string };

const expectPublished = async (items: ItemSlice[], published = true) => {
	for (let item of items) {
		item = (await Folder.loadByTitle(item.title)) ?? await Note.loadByTitle(item.title);
		expect(item).toMatchObject({
			title: item.title,
			is_shared: published ? 1 : 0,
		});
	}
};

const expectUnpublished = (items: ItemSlice[]) => expectPublished(items, false);

describe('models/Folder.publishing', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should set is_shared=1 on descendants of a published folder', async () => {
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

		// After the first round, only folders should have is_shared=1
		await expectPublished([
			'root',
			'sub-folder 1',
			'sub-folder 2',
			'sub-sub-folder',
		].map(title => ({ title })));
		await expectUnpublished([
			'published note 1',
			'published note 2',
			'published note 3',
			'unpublished folder',
			'unpublished note',
		].map(title => ({ title })));

		// Should update published notes when calling Note.updateNotePublicationStatus
		await Note.updatePublishedNotes(shareState);

		await expectPublished([
			'root',
			'sub-folder 1',
			'sub-folder 2',
			'sub-sub-folder',
			'published note 1',
			'published note 2',
			'published note 3',
		].map(title => ({ title })));
		await expectUnpublished([
			'unpublished folder',
			'unpublished note',
		].map(title => ({ title })));
	});
});
