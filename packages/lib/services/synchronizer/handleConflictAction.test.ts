import BaseItem from '../../models/BaseItem';
import Note from '../../models/Note';
import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import handleConflictAction from './utils/handleConflictAction';
import { SyncAction } from './utils/types';

describe('handleConflictAction', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	test('note conflict is created', async () => {
		const local = await Note.save({ title: 'Test', body: 'body' });
		// Pass the local note with unsaved changes to verify that the note is reloaded before creating the conflict
		const changedLocal = { ...local, title: 'TestChanged' };
		const remoteContent = { ...local, title: 'TestRemote' };
		const initialSyncItem = await BaseItem.syncItem(1, local.id);

		await handleConflictAction(
			SyncAction.NoteConflict,
			Note,
			true,
			remoteContent,
			changedLocal,
			1,
			false,
			(action) => (action),
		);

		const createdSyncItem = await BaseItem.syncItem(1, local.id);
		const updatedLocal = await Note.load(local.id);
		const notes = await Note.all();
		const conflictNote = await Note.loadByTitle('Test');

		expect(initialSyncItem).toBeUndefined();
		expect(createdSyncItem).toBeDefined();
		expect(updatedLocal.title).toBe('TestRemote');
		expect(notes.length).toBe(2);
		expect(conflictNote.id).not.toBe(local.id);
	});

	test('note conflict is not created when remote and local contents match', async () => {
		const local = await Note.save({ title: 'Test', body: 'body' });
		// Pass the local note with unsaved changes to verify that the note is reloaded before checking if eligible to create a conflict
		const changedLocal = { ...local, title: 'TestChanged' };
		const remoteContent = local;
		const initialSyncItem = await BaseItem.syncItem(1, local.id);

		await handleConflictAction(
			SyncAction.NoteConflict,
			Note,
			true,
			remoteContent,
			changedLocal,
			1,
			false,
			(action) => (action),
		);

		const createdSyncItem = await BaseItem.syncItem(1, local.id);
		const notes = await Note.all();
		expect(initialSyncItem).toBeUndefined();
		expect(createdSyncItem).toBeDefined();
		expect(notes.length).toBe(1);
	});

});
