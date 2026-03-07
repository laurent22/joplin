import Folder from '../../models/Folder';
import Note from '../../models/Note';
import Tag from '../../models/Tag';
import { setupDatabaseAndSynchronizer, switchClient, checkThrowAsync } from '../../testing/test-utils';
import emptyTrash from './emptyTrash';

describe('emptyTrash', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should empty the trash', async () => {
		const folder1 = await Folder.save({});
		const folder2 = await Folder.save({ parent_id: folder1.id });
		const folder3 = await Folder.save({});
		await Note.save({ parent_id: folder1.id });
		await Note.save({ parent_id: folder2.id });
		await Note.save({ parent_id: folder3.id });

		await Folder.delete(folder1.id, { toTrash: true });

		await emptyTrash();

		expect(await Folder.count()).toBe(1);
		expect(await Note.count()).toBe(1);
	});

	it('should remove orphaned tags after emptying the trash', async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ parent_id: folder1.id });
		await Tag.setNoteTagsByTitles(note1.id, ['test']);

		await Note.delete(note1.id, { toTrash: true });
		await emptyTrash();

		expect(await Tag.loadByTitle('test')).toBeFalsy();

		const note2 = await Note.save({ parent_id: folder1.id });
		await Tag.setNoteTagsByTitles(note2.id, ['test2']);

		const tag2 = await Tag.loadByTitle('test2');
		const hasThrown = await checkThrowAsync(async () => await Tag.save({ id: tag2.id, title: 'test' }, { userSideValidation: true }));

		expect(hasThrown).toBe(false);
	});

	it('should allow reusing a tag title after deleting a notebook and emptying trash', async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const note1 = await Note.save({ parent_id: folder1.id });
		await Tag.setNoteTagsByTitles(note1.id, ['test']);

		await Folder.delete(folder1.id, { toTrash: true });
		await emptyTrash();

		expect(await Tag.loadByTitle('test')).toBeFalsy();

		const note2 = await Note.save({ parent_id: folder2.id });
		await Tag.setNoteTagsByTitles(note2.id, ['test2']);

		const tag2 = await Tag.loadByTitle('test2');
		const hasThrown = await checkThrowAsync(async () => await Tag.save({ id: tag2.id, title: 'test' }, { userSideValidation: true }));

		expect(hasThrown).toBe(false);
	});

});
