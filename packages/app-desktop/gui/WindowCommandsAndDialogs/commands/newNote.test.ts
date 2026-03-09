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
	test.each([
		[null, null],
		['order', true],
		['order', false],
	])('should create a new note', async (sortOrderField: string, sortOrderReverse: boolean) => {
		// The command needs an active folder ID.
		const activeFolder = await Folder.save({ title: 'folder' });
		const initialNote = await Note.save({ title: 'test', parent_id: activeFolder.id });
		Setting.setValue('activeFolderId', activeFolder.id);
		Setting.setValue('notes.sortOrder.field', sortOrderField);
		Setting.setValue('notes.sortOrder.reverse', sortOrderReverse);

		await runtime().execute(null, 'test note', true);

		// Correct note should have been created
		const newNote = (await Note.loadByField('body', 'test note'));
		expect(newNote.body).toEqual('test note');
		expect(newNote.parent_id).toEqual(activeFolder.id);
		if (sortOrderField === 'order' && !!sortOrderReverse) {
			expect(newNote.order).toBeGreaterThanOrEqual(initialNote.order + Note.defaultIntevalBetweenNotes);
		} else if (sortOrderField === 'order' && !sortOrderReverse) {
			expect(newNote.order).toBeLessThanOrEqual(initialNote.order - Note.defaultIntevalBetweenNotes);
		} else {
			expect(newNote.order).toEqual(0);
		}
	});
});
