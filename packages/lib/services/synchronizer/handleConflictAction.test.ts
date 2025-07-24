import Folder from '../../models/Folder';
import Setting from '../../models/Setting';
import Tag from '../../models/Tag';
import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import handleConflictAction from './utils/handleConflictAction';
import { SyncAction } from './utils/types';

describe('handleConflictAction', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should throw fail-safe error when a folder item conflicts and the remote object does not exist, if fail-safe is enabled', async () => {
		Setting.setValue('sync.wipeOutFailSafe', true);
		const f1 = await Folder.save({ title: 'folder' });

		await expect(async () => {
			await handleConflictAction(SyncAction.ItemConflict, Folder, false, null, f1, 1, false, null);
		}).rejects.toThrow('Fail-safe: Sync was interrupted because the notebook [folder] and all its notes and sub-notebooks are about to be deleted. To override this behaviour disable the fail-safe in the sync settings.');

		expect(await Folder.load(f1.id)).not.toBeUndefined();
	});

	it('should delete local item when a folder item conflicts and the remote object does not exist, if fail-safe is not enabled', async () => {
		Setting.setValue('sync.wipeOutFailSafe', false);
		const f1 = await Folder.save({ title: 'folder' });

		await handleConflictAction(SyncAction.ItemConflict, Folder, false, null, f1, 1, false, null);
		expect(await Folder.load(f1.id)).toBeUndefined();
	});

	it('should delete local item when a non folder item conflicts and the remote object does not exist', async () => {
		Setting.setValue('sync.wipeOutFailSafe', true);
		const t1 = await Tag.save({ title: 'tag' });

		await handleConflictAction(SyncAction.ItemConflict, Tag, false, null, t1, 1, false, null);
		expect(await Tag.load(t1.id)).toBeUndefined();
	});

});
