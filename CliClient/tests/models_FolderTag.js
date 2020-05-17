/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync, ids, sortedIds } = require('test-utils.js');

const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const FolderTag = require('lib/models/FolderTag.js');
const Tag = require('lib/models/Tag.js');

const { TRASH_TAG_NAME, TRASH_TAG_ID } = require('lib/reserved-ids');

describe('models_FolderTag', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should report if folder tag link exists', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const folder3 = await Folder.save({ title: 'folder3' });

		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });

		const tag1 = await Tag.save({ title: 'tag1' });
		const tag2 = await Tag.save({ title: 'tag2' });
		const tag3 = await Tag.save({ title: 'tag3' });

		await Tag.addFolder(tag1.id, folder1.id);
		await Tag.addFolder(tag2.id, folder1.id);

		await Tag.addFolder(tag1.id, folder2.id);
		await Tag.addFolder(TRASH_TAG_ID, folder2.id);

		await Tag.addNote(tag3.id, note1.id);

		let folderHasTag = await FolderTag.exists(folder1.id, tag1.id);
		expect(folderHasTag).toBe(true);

		folderHasTag = await FolderTag.exists(folder1.id, tag2.id);
		expect(folderHasTag).toBe(true);

		folderHasTag = await FolderTag.exists(folder1.id, tag3.id);
		expect(folderHasTag).toBe(false);

		folderHasTag = await FolderTag.exists(folder1.id, TRASH_TAG_ID);
		expect(folderHasTag).toBe(false);

		folderHasTag = await FolderTag.exists(folder2.id, tag1.id);
		expect(folderHasTag).toBe(true);

		folderHasTag = await FolderTag.exists(folder2.id, tag2.id);
		expect(folderHasTag).toBe(false);

		folderHasTag = await FolderTag.exists(folder2.id, tag3.id);
		expect(folderHasTag).toBe(false);

		folderHasTag = await FolderTag.exists(folder2.id, TRASH_TAG_ID);
		expect(folderHasTag).toBe(true);
	}));

	it('should not allow a note to be used in place of a folder', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const tag1 = await Tag.save({ title: 'tag1' });

		let hasThrown = await checkThrowAsync(
			async () => await Tag.addFolder(tag1.id, folder1.id));
		expect(hasThrown).toBe(false);

		hasThrown = await checkThrowAsync(
			async () => await Tag.addFolder(tag1.id, note1.id));
		expect(hasThrown).toBe(true);
	}));

	it('should not allow a tag to be tagged with a folder', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const tag1 = await Tag.save({ title: 'tag1' });

		let hasThrown = await checkThrowAsync(
			async () => await Tag.addFolder(tag1.id, folder1.id));
		expect(hasThrown).toBe(false);

		hasThrown = await checkThrowAsync(
			async () => await Tag.addFolder(folder1.id, tag1.id));
		expect(hasThrown).toBe(true);

		hasThrown = await checkThrowAsync(
			async () => await Tag.addFolder(note1.id, folder1.id));
		expect(hasThrown).toBe(true);
	}));
});
