import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { setupCommandForTesting, setupApplication } from './utils/testUtils';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import app from './app';
import { getTrashFolderId } from '@joplin/lib/services/trash';
const Command = require('./command-rmnote');

const setUpCommand = () => {
	const command = setupCommandForTesting(Command);
	const promptMock = jest.fn(() => true);
	command.setPrompt(promptMock);

	return { command, promptMock };
};

const createTestNote = async () => {
	const folder = await Folder.save({ title: 'folder' });
	app().switchCurrentFolder(folder);
	return await Note.save({ title: 'note1', parent_id: folder.id });
};


describe('command-rmnote', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await setupApplication();
	});

	it('should move to the trash by default, without prompting', async () => {
		const { id: noteId } = await createTestNote();

		const { command, promptMock } = setUpCommand();
		await command.action({ 'note-pattern': 'note1', options: {} });
		expect(promptMock).not.toHaveBeenCalled();

		expect((await Note.allItemsInTrash()).noteIds.includes(noteId)).toBe(true);
	});

	it('should permanently delete trashed items by default, with prompting', async () => {
		const { id: noteId } = await createTestNote();
		const { command, promptMock } = setUpCommand();

		// Should not prompt when deleting from a folder
		await command.action({ 'note-pattern': 'note1', options: {} });
		expect(promptMock).toHaveBeenCalledTimes(0);

		// Should prompt when deleting from trash
		app().switchCurrentFolder(await Folder.load(getTrashFolderId()));
		await command.action({ 'note-pattern': 'note1', options: {} });
		expect(promptMock).toHaveBeenCalledTimes(1);

		expect(await Note.load(noteId, { includeDeleted: true })).toBe(undefined);
	});
});

