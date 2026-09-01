import { afterAllCleanUp, setupDatabaseAndSynchronizer } from '@joplin/lib/testing/test-utils';
import Note from '@joplin/lib/models/Note';
import { CommandContext } from '@joplin/lib/services/CommandService';
import { runtime } from './openNoteInNewWindow';
import Folder from '@joplin/lib/models/Folder';
import { getTrashFolderId } from '@joplin/lib/services/trash';

describe('openNoteInNewWindow', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
	});
	afterAll(async () => {
		await afterAllCleanUp();
	});

	it('should add the selected note to the new window state', async () => {
		const note = await Note.save({ title: 'Trashed note', deleted_time: Date.now() });
		let dispatchedAction: unknown = null;
		const context = {
			dispatch: (action: unknown) => dispatchedAction = action,
		} as CommandContext;

		await runtime().execute(context, note.id);

		const action = dispatchedAction as { defaultAppWindowState: { notes: unknown[] } };
		expect(action.defaultAppWindowState.notes).toEqual([await Note.load(note.id, { fields: Note.previewFields() })]);
		expect((dispatchedAction as { folderId: string }).folderId).toBe(getTrashFolderId());
	});

	it('should open conflict notes in the conflict folder', async () => {
		const note = await Note.save({ title: 'Conflict note', is_conflict: 1 });
		let dispatchedAction: unknown = null;
		const context = {
			dispatch: (action: unknown) => dispatchedAction = action,
		} as CommandContext;

		await runtime().execute(context, note.id);

		expect((dispatchedAction as { folderId: string }).folderId).toBe(Folder.conflictFolderId());
	});
});
