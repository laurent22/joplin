/* eslint-disable no-unused-vars */
require('app-module-path').addPath(__dirname);

const { setupDatabaseAndSynchronizer, switchClient, asyncTest, ids, sortedIds } = require('test-utils.js');
const Tag = require('lib/models/Tag.js');
const Note = require('lib/models/Note.js');
const Folder = require('lib/models/Folder.js');
const { FoldersScreenUtils } = require('lib/folders-screen-utils.js');
const { TRASH_TAG_ID, TRASH_TAG_NAME } = require('lib/reserved-ids.js');

describe('utils_FoldersScreen', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should not remove folders with children in trash', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await Note.batchDelete([note1.id], { permanent: false });
		await Folder.delete(folder1.id, { permanent: false });

		let folder = await Folder.load(folder1.id);
		expect(!!folder).toBe(true);

		// TEST ACTION simulates a background folder refresh (and trash cleanup)
		await FoldersScreenUtils.cleanupFoldersInTrash_();

		folder = await Folder.load(folder1.id);
		expect(!!folder).toBe(true);
	}));

	it('should remove childless folders in trash (1)', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await Note.batchDelete([note1.id], { permanent: false });
		await Folder.delete(folder1.id, { permanent: false });
		await Note.delete(note1.id, { permanent: true });

		// TEST ACTION simulates a background folder refresh (and trash cleanup)
		await FoldersScreenUtils.cleanupFoldersInTrash_();

		const folder = await Folder.load(folder1.id);
		expect(!!folder).toBe(false);
	}));

	it('should remove childless folders in trash (2)', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const folder1 = await Folder.save({ title: 'folder1' });
		let note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await Note.batchDelete([note1.id], { permanent: false });
		await Folder.delete(folder1.id, { permanent: false });

		// conflict the note
		note1 = await Note.load(note1.id);
		const conflictedNote = Object.assign({}, note1);
		delete conflictedNote.id;
		conflictedNote.is_conflict = 1;
		await Note.save(conflictedNote, { autoTimestamp: false });

		// TEST ACTION simulates a background folder refresh (and trash cleanup)
		await FoldersScreenUtils.cleanupFoldersInTrash_();

		const folder = await Folder.load(folder1.id);
		expect(!!folder).toBe(true);
	}));
});
