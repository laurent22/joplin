import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { setupCommandForTesting, setupApplication } from './utils/testUtils';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';
const Command = require('./command-rmbook');

const setUpCommand = () => {
	const command = setupCommandForTesting(Command);
	const promptMock = jest.fn(() => true);
	command.setPrompt(promptMock);

	return { command, promptMock };
};


describe('command-rmbook', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await setupApplication();
	});

	it('should ask before moving to the trash', async () => {
		await Folder.save({ title: 'folder1' });

		const { command, promptMock } = setUpCommand();

		await command.action({ 'notebook': 'folder1', options: {} });

		expect(promptMock).toHaveBeenCalledTimes(1);

		const folder1 = await Folder.loadByTitle('folder1');
		expect(folder1.deleted_time).not.toBeFalsy();
		expect((await Note.allItemsInTrash()).folderIds).toHaveLength(1);
	});

	it('cancelling a prompt should prevent deletion', async () => {
		await Folder.save({ title: 'folder1' });

		const { command, promptMock } = setUpCommand();
		promptMock.mockImplementation(() => false);
		await command.action({ 'notebook': 'folder1', options: {} });

		expect((await Note.allItemsInTrash()).folderIds).toHaveLength(0);
	});

	it('should not prompt when the force flag is given', async () => {
		const { id: folder1Id } = await Folder.save({ title: 'folder1' });
		const { id: folder2Id } = await Folder.save({ title: 'folder2', parent_id: folder1Id });

		const { command, promptMock } = setUpCommand();
		await command.action({ 'notebook': 'folder1', options: { force: true } });

		expect(promptMock).toHaveBeenCalledTimes(0);

		expect((await Note.allItemsInTrash()).folderIds.includes(folder1Id)).toBe(true);
		expect((await Note.allItemsInTrash()).folderIds.includes(folder2Id)).toBe(true);
	});

	it('should support permanent deletion', async () => {
		const { id: folder1Id } = await Folder.save({ title: 'folder1' });
		const { id: folder2Id } = await Folder.save({ title: 'folder2' });

		const { command, promptMock } = setUpCommand();
		await command.action({ 'notebook': 'folder1', options: { permanent: true, force: true } });
		expect(promptMock).not.toHaveBeenCalled();

		// Should be permanently deleted.
		expect((await Note.allItemsInTrash()).folderIds.includes(folder1Id)).toBe(false);
		expect(await Folder.load(folder1Id, { includeDeleted: true })).toBe(undefined);

		// folder2 should not be deleted
		expect(await Folder.load(folder2Id, { includeDeleted: false })).toBeTruthy();

		// Should prompt before deleting
		await command.action({ 'notebook': 'folder2', options: { permanent: true } });
		expect(promptMock).toHaveBeenCalled();
		expect(await Folder.load(folder2Id, { includeDeleted: false })).toBeUndefined();
	});
});

