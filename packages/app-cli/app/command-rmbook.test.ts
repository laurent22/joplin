import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { setupCommandForTesting, setupApplication } from './utils/testUtils';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';
const Command = require('./command-rmbook');


describe('command-rmbook', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await setupApplication();
	});

	it('should ask before moving to the trash', async () => {
		await Folder.save({ title: 'folder1' });

		const command = setupCommandForTesting(Command);
		const promptMock = jest.fn(() => 'y');
		command.setPrompt(promptMock);

		await command.action({ 'notebook': 'folder1', options: {} });

		expect(promptMock).toHaveBeenCalledTimes(1);

		const folder1 = await Folder.loadByTitle('folder1');
		expect(folder1.deleted_time).not.toBeFalsy();
		expect((await Note.allItemsInTrash()).folderIds).toHaveLength(1);
	});

	it('should not prompt when the force flag is given', async () => {
		const { id: folder1Id } = await Folder.save({ title: 'folder1' });
		const { id: folder2Id } = await Folder.save({ title: 'folder2', parent_id: folder1Id });

		const command = setupCommandForTesting(Command);
		const promptMock = jest.fn(() => 'y');
		command.setPrompt(promptMock);

		await command.action({ 'notebook': 'folder1', options: { force: true } });

		expect(promptMock).toHaveBeenCalledTimes(0);

		expect((await Note.allItemsInTrash()).folderIds.includes(folder1Id)).toBe(true);
		expect((await Note.allItemsInTrash()).folderIds.includes(folder2Id)).toBe(true);
	});


});

