import ShareService from '@joplin/lib/services/share/ShareService';
import mockShareService from '@joplin/lib/testing/share/mockShareService';
import { createFolderTree, setupDatabaseAndSynchronizer, switchClient, waitFor } from '@joplin/lib/testing/test-utils';
import { setupApplication, setupCommandForTesting } from './utils/testUtils';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import Setting from '@joplin/lib/models/Setting';
const Command = require('./command-publish');

const setUpCommand = () => {
	const onStdout = jest.fn();
	const command = setupCommandForTesting(Command, onStdout);

	return { command, onStdout };
};

describe('command-publish', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await setupApplication();

		mockShareService({
			getShares: async () => {
				return { items: [] };
			},
			postShares: async () => ({ id: 'test-id' }),
			getShareInvitations: async () => null,
		}, ShareService.instance());
	});

	test('should publish a note', async () => {
		const { command, onStdout } = setUpCommand();

		const testFolder = await Folder.save({ title: 'Test' });
		const testNote = await Note.save({ title: 'test', parent_id: testFolder.id });

		await command.action({
			note: testNote.id,
			options: {
				force: true,
			},
		});

		// Should be shared
		await waitFor(async () => {
			expect(await Note.load(testNote.id)).toMatchObject({
				is_shared: 1,
			});
		});

		// Should have logged the publication URL
		expect(onStdout).toHaveBeenCalled();
		expect(onStdout.mock.lastCall[0]).toMatch(/Published at URL:/);
	});

	test('should be enabled for Joplin Server and Cloud sync targets', () => {
		const { command } = setUpCommand();

		Setting.setValue('sync.target', 1);
		expect(command.enabled()).toBe(false);

		const supportedSyncTargets = [9, 10, 11];
		for (const id of supportedSyncTargets) {
			Setting.setValue('sync.target', id);
			expect(command.enabled()).toBe(true);
		}
	});

	test('should not ask for confirmation if a note is already published', async () => {
		const { command } = setUpCommand();

		const promptMock = jest.fn(() => true);
		command.setPrompt(promptMock);

		await createFolderTree('', [
			{
				title: 'folder 1',
				children: [
					{
						title: 'note 1',
						body: 'test',
					},
				],
			},
		]);
		const noteId = (await Note.loadByTitle('note 1')).id;

		// Should ask for confirmation when first sharing
		await command.action({
			note: noteId,
			options: { },
		});
		expect(promptMock).toHaveBeenCalledTimes(1);
		expect(await Note.load(noteId)).toMatchObject({ is_shared: 1 });

		// Should not ask for confirmation if called again for the same note
		await command.action({
			note: noteId,
			options: { },
		});
		expect(promptMock).toHaveBeenCalledTimes(1);
	});
});
