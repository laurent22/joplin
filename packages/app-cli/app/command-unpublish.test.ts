import ShareService from '@joplin/lib/services/share/ShareService';
import mockShareService from '@joplin/lib/testing/share/mockShareService';
import { setupDatabaseAndSynchronizer, switchClient, waitFor } from '@joplin/lib/testing/test-utils';
import { setupApplication, setupCommandForTesting } from './utils/testUtils';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
const Command = require('./command-unpublish');


describe('command-unpublish', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await setupApplication();

		mockShareService({
			getShares: async () => {
				return { items: [{ id: 'test-id' }] };
			},
			postShares: async () => {
				throw new Error('Unexpected call to postShares');
			},
			getShareInvitations: async () => null,
		}, ShareService.instance());
	});

	test('should unpublish a note', async () => {
		const command = setupCommandForTesting(Command, ()=>{});

		const testFolder = await Folder.save({ title: 'Test' });
		const testNote = await Note.save({ title: 'test', parent_id: testFolder.id, is_shared: 1 });

		await command.action({
			note: testNote.id,
		});

		await waitFor(async () => {
			expect(await Note.load(testNote.id)).toMatchObject({
				is_shared: 0,
			});
		});
	});
});
