/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync, ids, sortedIds } = require('test-utils.js');

const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const NoteTag = require('lib/models/NoteTag.js');
const Tag = require('lib/models/Tag.js');

const { TRASH_TAG_NAME, TRASH_TAG_ID } = require('lib/reserved-ids');

describe('models_NoteTag', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should report if note tag link exists', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'votre note', parent_id: folder1.id });

		await Tag.setNoteTagsByTitles(note1.id, ['un', 'deux']);
		await Tag.setNoteTagsByIds(note2.id, [TRASH_TAG_ID]);
		await Tag.addNoteTagByTitle(note2.id, 'un');

		const tag1 = await Tag.loadByTitle('un');
		const tag2 = await Tag.loadByTitle('deux');
		const tag3 = await Tag.save({ title: 'tre' });

		let noteHasTag = await NoteTag.exists(note1.id, tag1.id);
		expect(noteHasTag).toBe(true);

		noteHasTag = await NoteTag.exists(note1.id, tag2.id);
		expect(noteHasTag).toBe(true);

		noteHasTag = await NoteTag.exists(note1.id, tag3.id);
		expect(noteHasTag).toBe(false);

		noteHasTag = await NoteTag.exists(note1.id, TRASH_TAG_ID);
		expect(noteHasTag).toBe(false);

		noteHasTag = await NoteTag.exists(note2.id, tag1.id);
		expect(noteHasTag).toBe(true);

		noteHasTag = await NoteTag.exists(note2.id, tag2.id);
		expect(noteHasTag).toBe(false);

		noteHasTag = await NoteTag.exists(note2.id, tag3.id);
		expect(noteHasTag).toBe(false);

		noteHasTag = await NoteTag.exists(note2.id, TRASH_TAG_ID);
		expect(noteHasTag).toBe(true);
	}));

	it('should not allow a folder to be used in place of a note', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const tag1 = await Tag.save({ title: 'tag1' });

		let hasThrown = await checkThrowAsync(
			async () => await Tag.addNote(tag1.id, note1.id));
		expect(hasThrown).toBe(false);

		hasThrown = await checkThrowAsync(
			async () => await Tag.addNote(tag1.id, folder1.id));
		expect(hasThrown).toBe(true);
	}));

	it('should not allow a tag to be tagged with a note', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const tag1 = await Tag.save({ title: 'tag1' });

		let hasThrown = await checkThrowAsync(
			async () => await Tag.addNote(tag1.id, note1.id));
		expect(hasThrown).toBe(false);

		hasThrown = await checkThrowAsync(
			async () => await Tag.addNote(note1.id, tag1.id));
		expect(hasThrown).toBe(true);

		hasThrown = await checkThrowAsync(
			async () => await Tag.addNote(folder1.id, note1.id));
		expect(hasThrown).toBe(true);
	}));
});
