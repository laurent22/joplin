import { setupDatabaseAndSynchronizer, switchClient, resourceService } from '../testing/test-utils';
import Folder from '../models/Folder';
import { ShareType, StateShare } from '../services/share/reducer';
import BaseItem from './BaseItem';

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
		const root = await Folder.save({
			title: 'root',
		});
		const child1 = await Folder.save({
			title: 'sub-folder-1',
			parent_id: root.id,
		});
		const child2 = await Folder.save({
			title: 'sub-folder-2',
			parent_id: root.id,
		});
		const grandChild1 = await Folder.save({
			title: 'sub-sub-folder',
			parent_id: child1.id,
		});
		const unpublished = await Folder.save({
			title: 'not published',
		});

		const shareState: StateShare[] = [
			publishedFolderShareState(root.id),
		];

		await Folder.updateAllShareIds(
			resourceService(),
			shareState,
		);

		await expectPublished(root.id);
		await expectPublished(child1.id);
		await expectPublished(child2.id);
		await expectPublished(grandChild1.id);
		await expectUnpublished(unpublished.id);
	});
});
