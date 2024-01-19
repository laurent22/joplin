import { Day, msleep } from '@joplin/utils/time';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
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

		// Similates a folder having been deleted a long time ago - so it should be deleted. But
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

});
