import { Day, msleep } from '@joplin/utils/time';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import { setupDatabaseAndSynchronizer, simulateReadOnlyShareEnv, switchClient } from '../../testing/test-utils';
import permanentlyDeleteOldItems from './permanentlyDeleteOldItems';
import Setting from '../../models/Setting';

describe('permanentlyDeleteOldItems', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should auto-delete old items', async () => {
		const folder1 = await Folder.save({});
		const folder2 = await Folder.save({});
		const note1 = await Note.save({ parent_id: folder1.id });
		const note2 = await Note.save({});

		await Folder.delete(folder1.id, { toTrash: true, deleteChildren: true });

		// First check that it doesn't auto-delete if it's not within the right interval
		await permanentlyDeleteOldItems(Day);

		expect((await Folder.load(folder1.id))).toBeTruthy();
		expect((await Folder.load(folder2.id))).toBeTruthy();
		expect((await Note.load(note1.id))).toBeTruthy();
		expect((await Note.load(note2.id))).toBeTruthy();

		await msleep(1);
		await permanentlyDeleteOldItems(0);

		expect((await Folder.load(folder1.id))).toBeFalsy();
		expect((await Folder.load(folder2.id))).toBeTruthy();
		expect((await Note.load(note1.id))).toBeFalsy();
		expect((await Note.load(note2.id))).toBeTruthy();
	});

	it('should not auto-delete non-empty folders', async () => {
		const folder1 = await Folder.save({});
		const folder2 = await Folder.save({});
		const note1 = await Note.save({ parent_id: folder1.id });
		const note2 = await Note.save({});

		await Folder.delete(folder1.id, { toTrash: true, deleteChildren: true });

		// Simulates a folder having been deleted a long time ago - so it should be deleted. But
		// since it contains a note it should not.
		await Folder.save({ id: folder1.id, deleted_time: 1000 });

		await permanentlyDeleteOldItems(Day);

		expect((await Folder.load(folder1.id))).toBeTruthy();
		expect((await Note.load(note1.id))).toBeTruthy();

		// Now both folders and items are within the deletion interval, so they should be both be
		// auto-deleted
		await Note.save({ id: note1.id, deleted_time: 1000 });

		await permanentlyDeleteOldItems(1);

		expect((await Folder.load(folder1.id))).toBeFalsy();
		expect((await Folder.load(folder2.id))).toBeTruthy();
		expect((await Note.load(note1.id))).toBeFalsy();
		expect((await Note.load(note2.id))).toBeTruthy();
	});

	it('should not do anything if auto-deletion is not enabled', async () => {
		Setting.setValue('trash.autoDeletionEnabled', false);
		const folder1 = await Folder.save({});
		await Folder.delete(folder1.id, { toTrash: true });
		await msleep(1);
		await permanentlyDeleteOldItems(0);
		expect(await Folder.count()).toBe(1);
	});

	it('should not auto-delete read-only items', async () => {
		const shareId = 'testShare';

		// Simulates a folder having been deleted a long time ago
		const longTimeAgo = 1000;

		const readOnlyFolder = await Folder.save({
			title: 'Read-only folder',
			share_id: shareId,
			deleted_time: longTimeAgo,
		});
		const readOnlyNote1 = await Note.save({
			title: 'Read-only note',
			parent_id: readOnlyFolder.id,
			share_id: shareId,
			deleted_time: longTimeAgo,
		});
		const readOnlyNote2 = await Note.save({
			title: 'Read-only note 2',
			share_id: shareId,
			deleted_time: longTimeAgo,
		});
		const writableNote = await Note.save({
			title: 'Editable note',
			deleted_time: longTimeAgo,
		});

		const cleanup = simulateReadOnlyShareEnv(shareId);
		await permanentlyDeleteOldItems(Day);

		// Should preserve only the read-only items.
		expect(await Folder.load(readOnlyFolder.id)).toBeTruthy();
		expect(await Note.load(readOnlyNote1.id)).toBeTruthy();
		expect(await Note.load(readOnlyNote2.id)).toBeTruthy();
		expect(await Note.load(writableNote.id)).toBeFalsy();

		cleanup();
	});
});
