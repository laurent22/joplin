import NavService from '@joplin/lib/services/NavService';
import { runtime } from './newNote';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import Setting from '@joplin/lib/models/Setting';

describe('newNote', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});
	test('should create and navigate to a new note', async () => {
		const dispatchMock = jest.fn();
		NavService.dispatch = dispatchMock;

		// The command needs an active folder ID.
		const activeFolder = await Folder.save({ title: 'folder' });
		Setting.setValue('activeFolderId', activeFolder.id);

		await runtime().execute(null, 'test note', true);
		expect(dispatchMock).toHaveBeenCalledTimes(1);

		// Correct note should have been created
		const noteId = dispatchMock.mock.lastCall[0].noteId;
		expect(await Note.load(noteId)).toMatchObject({ body: 'test note', parent_id: activeFolder.id });

		// Should have tried to navigate to the note.
		expect(dispatchMock.mock.lastCall).toMatchObject([
			{ noteId: noteId, noteHash: '' },
		]);
	});
});
