/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync, ids, sortedIds } = require('test-utils.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const NoteTag = require('lib/models/NoteTag.js');
const Tag = require('lib/models/Tag.js');
const BaseModel = require('lib/BaseModel.js');
const { uuid } = require('lib/uuid.js');
const { shim } = require('lib/shim');
const { TRASH_TAG_NAME, TRASH_TAG_ID } = require('lib/reserved-ids');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('models_Tag', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should add tags by title', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });

		await Tag.setNoteTagsByTitles(note1.id, ['un', 'deux']);

		const noteTags = await Tag.tagsByNoteId(note1.id);
		expect(noteTags.length).toBe(2);
	}));

	it('should not allow renaming tag to existing tag names', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });

		await Tag.setNoteTagsByTitles(note1.id, ['un', 'deux']);

		const tagUn = await Tag.loadByTitle('un');
		const hasThrown = await checkThrowAsync(async () => await Tag.save({ id: tagUn.id, title: 'deux' }, { userSideValidation: true }));

		expect(hasThrown).toBe(true);
	}));

	it('should not return tags without notes', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await Tag.setNoteTagsByTitles(note1.id, ['un']);

		let tags = await Tag.allWithNotes();
		expect(tags.length).toBe(1);

		await Note.delete(note1.id);

		tags = await Tag.allWithNotes();
		expect(tags.length).toBe(0);
	}));

	it('should return all tags with note counts', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'ma 2nd note', parent_id: folder1.id });
		await Tag.setNoteTagsByTitles(note1.id, ['un']);
		await Tag.setNoteTagsByTitles(note2.id, ['un']);

		let tags = await Tag.allWithNotes();
		expect(tags.length).toBe(1);
		expect(tags[0].note_count).toBe(2);

		await Note.delete(note1.id);

		tags = await Tag.allWithNotes();
		expect(tags.length).toBe(1);
		expect(tags[0].note_count).toBe(1);

		await Note.delete(note2.id);

		tags = await Tag.allWithNotes();
		expect(tags.length).toBe(0);
	}));

	it('should return all tags including trash tag', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const tag1 = await Tag.save({ title: 'tag1' });

		let tags = await Tag.all();
		expect(sortedIds(tags)).toEqual([tag1.id].sort());

		tags = await Tag.all({ includeTrash: true });
		expect(sortedIds(tags)).toEqual([TRASH_TAG_ID, tag1.id].sort());
	}));

	it('should return all tags excluding trash tag', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const tag1 = await Tag.save({ title: 'tag1' });

		let tags = await Tag.all();
		expect(sortedIds(tags)).toEqual([tag1.id].sort());

		tags = await Tag.all({ includeTrash: false });
		expect(sortedIds(tags)).toEqual([tag1.id].sort());
	}));

	it('should return all tags with note counts excluding trash', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const folder1 = await Folder.save({ title: 'folder1' });
		const taga = await Tag.save({ title: 'taga' }); // non-trash notes
		const tagb = await Tag.save({ title: 'tagb' }); // trash and non-trash notes
		const tagc = await Tag.save({ title: 'tagc' }); // no notes
		const tagd = await Tag.save({ title: 'tagd' }); // trash notes only
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });
		const note3 = await Note.save({ title: 'note3', parent_id: folder1.id });
		await Tag.addNote(taga.id, note1.id);
		await Tag.addNote(taga.id, note2.id);
		await Tag.addNote(tagb.id, note2.id);
		await Tag.addNote(tagb.id, note3.id);
		await Tag.addNote(tagd.id, note3.id);
		await Tag.addNote(TRASH_TAG_ID, note3.id);

		// tags excluding those only in trash and trash tag itself
		let tags = await Tag.allWithNotes();
		expect(sortedIds(tags)).toEqual(sortedIds([taga, tagb]));

		await Note.delete(note2.id);

		// tagb now only exists in trash
		tags = await Tag.allWithNotes();
		expect(sortedIds(tags)).toEqual(sortedIds([taga]));
	}));

	it('should load individual tags with note counts', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'ma 2nd note', parent_id: folder1.id });
		const tag = await Tag.save({ title: 'mytag' });
		await Tag.addNote(tag.id, note1.id);

		let tagWithCount = await Tag.loadWithCount_(tag.id);
		expect(tagWithCount.note_count).toBe(1);

		await Tag.addNote(tag.id, note2.id);

		tagWithCount = await Tag.loadWithCount_(tag.id);
		expect(tagWithCount.note_count).toBe(2);
	}));

	it('should return note ids for a given tag id excluding trash (1)', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const folder1 = await Folder.save({ title: 'folder1' });
		const taga = await Tag.save({ title: 'taga' }); // non-trash notes
		const tagb = await Tag.save({ title: 'tagb' }); // trash and non-trash notes
		const tagc = await Tag.save({ title: 'tagc' }); // no notes
		const tagd = await Tag.save({ title: 'tagd' }); // trash notes only
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });
		const note3 = await Note.save({ title: 'note3', parent_id: folder1.id });
		await Tag.addNote(taga.id, note1.id);
		await Tag.addNote(tagb.id, note1.id);
		await Tag.addNote(tagb.id, note2.id);
		await Tag.addNote(tagb.id, note3.id);
		await Tag.addNote(tagd.id, note3.id);
		await Tag.addNote(TRASH_TAG_ID, note3.id);

		// non-trash notes
		let noteIds = await Tag.noteIds(taga.id);
		expect(noteIds).toEqual([note1.id]);

		// trash and non-trash notes
		noteIds = await Tag.noteIds(tagb.id);
		expect(noteIds).toEqual(ids([note1, note2]));

		// no notes
		noteIds = await Tag.noteIds(tagc.id);
		expect(noteIds).toEqual([]);

		// trash notes only
		noteIds = await Tag.noteIds(tagd.id);
		expect(noteIds).toEqual([]);

		// trash tag itself (exception)
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds).toEqual([note3.id]);
	}));

	// as above, but with explicit option to noteIds()
	it('should return note ids for a given tag id excluding trash (2)', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const folder1 = await Folder.save({ title: 'folder1' });
		const taga = await Tag.save({ title: 'taga' }); // non-trash notes
		const tagb = await Tag.save({ title: 'tagb' }); // trash and non-trash notes
		const tagc = await Tag.save({ title: 'tagc' }); // no notes
		const tagd = await Tag.save({ title: 'tagd' }); // trash notes only
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });
		const note3 = await Note.save({ title: 'note3', parent_id: folder1.id });
		await Tag.addNote(taga.id, note1.id);
		await Tag.addNote(tagb.id, note1.id);
		await Tag.addNote(tagb.id, note2.id);
		await Tag.addNote(tagb.id, note3.id);
		await Tag.addNote(tagd.id, note3.id);
		await Tag.addNote(TRASH_TAG_ID, note3.id);

		// non-trash notes
		let noteIds = await Tag.noteIds(taga.id, { includeTrash: false });
		expect(noteIds).toEqual([note1.id]);

		// trash and non-trash notes
		noteIds = await Tag.noteIds(tagb.id, { includeTrash: false });
		expect(noteIds).toEqual(ids([note1, note2]));

		// no notes
		noteIds = await Tag.noteIds(tagc.id, { includeTrash: false });
		expect(noteIds).toEqual([]);

		// trash notes only
		noteIds = await Tag.noteIds(tagd.id, { includeTrash: false });
		expect(noteIds).toEqual([]);

		// trash tag itself (exception)
		noteIds = await Tag.noteIds(TRASH_TAG_ID, { includeTrash: false });
		expect(noteIds).toEqual([note3.id]);
	}));

	it('should not get note ids for a given tag id including trash', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const folder1 = await Folder.save({ title: 'folder1' });
		const taga = await Tag.save({ title: 'taga' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await Tag.addNote(taga.id, note1.id);

		const hasThrown = await checkThrowAsync(
			async () => await Tag.noteIds(taga.id, { includeTrash: true }));
		expect(hasThrown).toBe(true);
	}));

	it('should get note ids only for existing notes', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const folder1 = await Folder.save({ title: 'folder1' });
		const tag = await Tag.save({ title: 'tag' }); // non-trash notes
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });
		const note3 = await Note.save({ title: 'note3', parent_id: folder1.id });
		const note4 = await Note.save({ title: 'note4', parent_id: folder1.id });
		await Tag.addNote(tag.id, note1.id);
		await Tag.addNote(tag.id, note2.id);
		await Tag.addNote(tag.id, note3.id);
		await Tag.addNote(tag.id, note4.id);
		await Tag.addNote(TRASH_TAG_ID, note4.id);

		// check setup
		let noteIds = await Tag.noteIds(tag.id);
		expect(noteIds.sort()).toEqual(sortedIds([note1, note2, note3]));

		// delete notes
		await Note.batchDelete([note2.id], { permanent: false });
		await Note.batchDelete([note3.id, note4.id], { permanent: true });

		// check note ids are returned for existing and non trash notes
		noteIds = await Tag.noteIds(tag.id);
		expect(noteIds.sort()).toEqual(sortedIds([note1]));

		// restore a note
		await Note.undelete([note2.id]);

		// check note ids are returned for existing and non trash notes
		noteIds = await Tag.noteIds(tag.id);
		expect(noteIds.sort()).toEqual(sortedIds([note1, note2]));
	}));

	it('should get common tags for set of notes', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const taga = await Tag.save({ title: 'mytaga' });
		const tagb = await Tag.save({ title: 'mytagb' });
		const tagc = await Tag.save({ title: 'mytagc' });
		const tagd = await Tag.save({ title: 'mytagd' });

		const note0 = await Note.save({ title: 'ma note 0', parent_id: folder1.id });
		const note1 = await Note.save({ title: 'ma note 1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'ma note 2', parent_id: folder1.id });
		const note3 = await Note.save({ title: 'ma note 3', parent_id: folder1.id });

		await Tag.addNote(taga.id, note1.id);

		await Tag.addNote(taga.id, note2.id);
		await Tag.addNote(tagb.id, note2.id);

		await Tag.addNote(taga.id, note3.id);
		await Tag.addNote(tagb.id, note3.id);
		await Tag.addNote(tagc.id, note3.id);

		let commonTags = await Tag.commonTagsByNoteIds(null);
		expect(commonTags.length).toBe(0);

		commonTags = await Tag.commonTagsByNoteIds(undefined);
		expect(commonTags.length).toBe(0);

		commonTags = await Tag.commonTagsByNoteIds([]);
		expect(commonTags.length).toBe(0);

		commonTags = await Tag.commonTagsByNoteIds([note0.id, note1.id, note2.id, note3.id]);
		let commonTagIds = commonTags.map(t => t.id);
		expect(commonTagIds.length).toBe(0);

		commonTags = await Tag.commonTagsByNoteIds([note1.id, note2.id, note3.id]);
		commonTagIds = commonTags.map(t => t.id);
		expect(commonTagIds.length).toBe(1);
		expect(commonTagIds.includes(taga.id)).toBe(true);

		commonTags = await Tag.commonTagsByNoteIds([note2.id, note3.id]);
		commonTagIds = commonTags.map(t => t.id);
		expect(commonTagIds.length).toBe(2);
		expect(commonTagIds.includes(taga.id)).toBe(true);
		expect(commonTagIds.includes(tagb.id)).toBe(true);

		commonTags = await Tag.commonTagsByNoteIds([note3.id]);
		commonTagIds = commonTags.map(t => t.id);
		expect(commonTags.length).toBe(3);
		expect(commonTagIds.includes(taga.id)).toBe(true);
		expect(commonTagIds.includes(tagb.id)).toBe(true);
		expect(commonTagIds.includes(tagc.id)).toBe(true);
	}));

	it('should search all tags with notes', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const folder1 = await Folder.save({ title: 'folder1' });
		const taga = await Tag.save({ title: 'taga' }); // non-trash notes
		const tagb = await Tag.save({ title: 'tagb' }); // trash and non-trash notes
		const tagc = await Tag.save({ title: 'tagc' }); // no notes
		const tagd = await Tag.save({ title: 'tagd' }); // trash notes only
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });
		const note3 = await Note.save({ title: 'note3', parent_id: folder1.id });
		await Tag.addNote(taga.id, note1.id);
		await Tag.addNote(tagb.id, note1.id);
		await Tag.addNote(tagb.id, note2.id);
		await Tag.addNote(tagb.id, note3.id);
		await Tag.addNote(tagd.id, note3.id);
		await Tag.addNote(TRASH_TAG_ID, note3.id);

		// tags excluding those only in trash and trash tag itself
		let tags = await Tag.searchAllWithNotes();
		expect(sortedIds(tags)).toEqual(sortedIds([taga, tagb]));

		tags = await Tag.searchAllWithNotes({ titlePattern: 'tagd' });
		expect(sortedIds(tags)).toEqual(sortedIds([]));

		tags = await Tag.searchAllWithNotes({ titlePattern: TRASH_TAG_NAME });
		expect(sortedIds(tags)).toEqual(sortedIds([]));
	}));

	it('should not allow deletion of trash tag', asyncTest(async () => {
		let tag = await Tag.load(TRASH_TAG_ID);
		expect(!!tag).toBe(false);
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		// TEST ACTION
		await Tag.delete(TRASH_TAG_ID);

		// check tag still exists
		tag = await Tag.load(TRASH_TAG_ID);
		expect(!!tag).toBe(true);

		// Apply tag to note
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await Tag.addNote(TRASH_TAG_ID, note1.id);

		// TEST ACTION
		await Tag.delete(TRASH_TAG_ID);

		// check tag still exists
		tag = await Tag.load(TRASH_TAG_ID);
		expect(!!tag).toBe(true);
		const hasNote = await Tag.hasNote(TRASH_TAG_ID, note1.id);
		expect(hasNote).toBe(true);
	}));

	it('should not allow creation of trash tag imposters', asyncTest(async () => {
		let tag = null;
		let hasThrown = await checkThrowAsync(async () => tag = await Tag.save({ title: TRASH_TAG_NAME }, { userSideValidation: true }));
		expect(hasThrown).toBe(true);
		expect(!tag).toBe(true);

		hasThrown = await checkThrowAsync(async () => tag = await Tag.save({ title: TRASH_TAG_NAME }, { userSideValidation: false }));
		expect(hasThrown).toBe(true);
		expect(!tag).toBe(true);

		hasThrown = await checkThrowAsync(async () => tag = await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }));
		expect(hasThrown).toBe(true);
		expect(!tag).toBe(true);

		tag = await Tag.load(TRASH_TAG_ID);
		expect(!tag).toBe(true);

		// this is the real trash tag
		tag = await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		expect(tag.id).toEqual(TRASH_TAG_ID);

		tag = await Tag.load(TRASH_TAG_ID);
		expect(tag.title).toBe(TRASH_TAG_NAME);

		hasThrown = await checkThrowAsync(async () => await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }));
		expect(hasThrown).toBe(true);

		hasThrown = await checkThrowAsync(async () => await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true }));
		expect(hasThrown).toBe(true);
	}));

	it('should not allow rename to trash tag name', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });

		await Tag.setNoteTagsByTitles(note1.id, ['un', 'deux']);

		const tagUn = await Tag.loadByTitle('un');
		let hasThrown = await checkThrowAsync(async () => await Tag.save({ id: tagUn.id, title: TRASH_TAG_NAME }, { userSideValidation: true }));
		expect(hasThrown).toBe(true);

		hasThrown = await checkThrowAsync(async () => await Tag.save({ id: tagUn.id, title: TRASH_TAG_NAME }, { userSideValidation: false }));
		expect(hasThrown).toBe(true);
	}));

	it('should not allow tagging with non-existant tag or note', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		const tag = await Tag.save({ title: 'tag' });

		await Tag.setNoteTagsByTitles(note1.id, ['un', 'deux']);

		let hasThrown = await checkThrowAsync(async () => await Tag.addNote(uuid.create(), note1.id));
		expect(hasThrown).toBe(true);

		hasThrown = await checkThrowAsync(async () => await Tag.addNote(tag.id, uuid.create()));
		expect(hasThrown).toBe(true);

		hasThrown = await checkThrowAsync(async () => await Tag.addNote(tag.id, note1.id));
		expect(hasThrown).toBe(false);
	}));

	it('should tag folders and return folders for a given tag (1)', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const folder3 = await Folder.save({ title: 'folder3' });
		const folder4 = await Folder.save({ title: 'folder4', parent_id: folder1.id });
		const taga = await Tag.save({ title: 'taga' }); // non-trash notes
		const tagb = await Tag.save({ title: 'tagb' }); // trash and non-trash notes
		const tagc = await Tag.save({ title: 'tagc' }); // no notes
		const tagd = await Tag.save({ title: 'tagd' }); // trash notes only
		await Tag.addFolder(taga.id, folder1.id);
		await Tag.addFolder(tagb.id, folder1.id);
		await Tag.addFolder(tagb.id, folder2.id);
		await Tag.addFolder(tagb.id, folder3.id);
		await Tag.addFolder(tagd.id, folder3.id);
		await Tag.addFolder(TRASH_TAG_ID, folder3.id);

		// non-trash folders
		let folderIds = await Tag.folderIds(taga.id);
		expect(folderIds).toEqual([folder1.id]);

		// trash and non-trash folders
		folderIds = await Tag.folderIds(tagb.id);
		expect(folderIds).toEqual(ids([folder1, folder2]));

		// no folders
		folderIds = await Tag.folderIds(tagc.id);
		expect(folderIds).toEqual([]);

		// trash folders only
		folderIds = await Tag.folderIds(tagd.id);
		expect(folderIds).toEqual([]);

		// trash tag itself
		folderIds = await Tag.folderIds(TRASH_TAG_ID);
		expect(folderIds).toEqual([folder3.id]);
	}));

	// as previous, but with explicit option to folderIds()
	it('should tag folders and return folders for a given tag (2)', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const folder3 = await Folder.save({ title: 'folder3' });
		const folder4 = await Folder.save({ title: 'folder4', parent_id: folder1.id });
		const taga = await Tag.save({ title: 'taga' }); // non-trash notes
		const tagb = await Tag.save({ title: 'tagb' }); // trash and non-trash notes
		const tagc = await Tag.save({ title: 'tagc' }); // no notes
		const tagd = await Tag.save({ title: 'tagd' }); // trash notes only
		await Tag.addFolder(taga.id, folder1.id);
		await Tag.addFolder(tagb.id, folder1.id);
		await Tag.addFolder(tagb.id, folder2.id);
		await Tag.addFolder(tagb.id, folder3.id);
		await Tag.addFolder(tagd.id, folder3.id);
		await Tag.addFolder(TRASH_TAG_ID, folder3.id);

		// non-trash folders
		let folderIds = await Tag.folderIds(taga.id, { includeTrash: false });
		expect(folderIds).toEqual([folder1.id]);

		// trash and non-trash folders
		folderIds = await Tag.folderIds(tagb.id, { includeTrash: false });
		expect(folderIds).toEqual(ids([folder1, folder2]));

		// no folders
		folderIds = await Tag.folderIds(tagc.id, { includeTrash: false });
		expect(folderIds).toEqual([]);

		// trash folders only
		folderIds = await Tag.folderIds(tagd.id, { includeTrash: false });
		expect(folderIds).toEqual([]);

		// trash tag itself
		folderIds = await Tag.folderIds(TRASH_TAG_ID, { includeTrash: false });
		expect(folderIds).toEqual([folder3.id]);
	}));

	it('should not get folders for a given tag including trash', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const folder1 = await Folder.save({ title: 'folder1' });
		const taga = await Tag.save({ title: 'taga' });
		await Tag.addFolder(taga.id, folder1.id);

		const hasThrown = await checkThrowAsync(
			async () => await Tag.folderIds(taga.id, { includeTrash: true }));
		expect(hasThrown).toBe(true);
	}));

	it('should not mix up notes and folders when getting tagged items', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder2.id });
		const tag = await Tag.save({ title: 'tag' });
		await Tag.addNote(tag.id, note1.id);
		await Tag.addFolder(tag.id, folder1.id);

		let itemIds = await Tag.folderIds(tag.id);
		expect(itemIds).toEqual([folder1.id]);

		itemIds = await Tag.noteIds(tag.id);
		expect(itemIds).toEqual([note1.id]);
	}));

	it('should handle if tag or folder does not exist when tagging folder', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const tag1 = await Tag.save({ title: 'tag1' });
		const tag2 = await Tag.save({ title: 'tag2' });

		await Folder.delete(folder2.id);
		await Tag.delete(tag2.id);

		let hasThrown = await checkThrowAsync(
			async () => await Tag.addFolder(tag1.id, folder1.id));
		expect(hasThrown).toBe(false);

		hasThrown = await checkThrowAsync(
			async () => await await Tag.addFolder(tag1.id, folder2.id));
		expect(hasThrown).toBe(true);

		hasThrown = await checkThrowAsync(
			async () => await Tag.addFolder(tag2.id, folder1.id));
		expect(hasThrown).toBe(true);

		hasThrown = await checkThrowAsync(
			async () => await await Tag.addFolder(tag2.id, folder2.id));
		expect(hasThrown).toBe(true);
	}));

	it('should remove tags from folders', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const taga = await Tag.save({ title: 'taga' });
		const tagb = await Tag.save({ title: 'tagb' });
		await Tag.addFolder(taga.id, folder1.id);
		await Tag.addFolder(tagb.id, folder1.id);
		await Tag.addFolder(taga.id, folder2.id);
		await Tag.addFolder(tagb.id, folder2.id);
		await Tag.addFolder(TRASH_TAG_ID, folder2.id);

		let itemIds = await Tag.folderIds(taga.id);
		expect(itemIds).toEqual([folder1.id]);

		itemIds = await Tag.folderIds(tagb.id);
		expect(itemIds).toEqual([folder1.id]);

		itemIds = await Tag.folderIds(TRASH_TAG_ID);
		expect(itemIds).toEqual([folder2.id]);

		// TEST ACTION
		await Tag.removeFolder(taga.id, folder1.id);

		itemIds = await Tag.folderIds(taga.id);
		expect(itemIds).toEqual([]);

		itemIds = await Tag.folderIds(tagb.id);
		expect(itemIds).toEqual([folder1.id]);

		itemIds = await Tag.folderIds(TRASH_TAG_ID);
		expect(itemIds).toEqual([folder2.id]);

		// TEST ACTION
		await Tag.removeFolder(taga.id, folder2.id);

		itemIds = await Tag.folderIds(taga.id);
		expect(itemIds).toEqual([]);

		itemIds = await Tag.folderIds(tagb.id);
		expect(itemIds).toEqual([folder1.id]);

		itemIds = await Tag.folderIds(TRASH_TAG_ID);
		expect(itemIds).toEqual([folder2.id]);

		// TEST ACTION
		await Tag.removeFolder(TRASH_TAG_ID, folder2.id);

		itemIds = await Tag.folderIds(taga.id);
		expect(itemIds).toEqual([]);

		itemIds = await Tag.folderIds(tagb.id);
		expect(itemIds.sort()).toEqual(sortedIds([folder1, folder2]));

		itemIds = await Tag.folderIds(TRASH_TAG_ID);
		expect(itemIds).toEqual([]);
	}));

	it('should report if tag is on folder', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const taga = await Tag.save({ title: 'taga' });
		const tagb = await Tag.save({ title: 'tagb' });
		const tagc = await Tag.save({ title: 'tagc' });
		await Tag.addFolder(taga.id, folder1.id);
		await Tag.addFolder(tagb.id, folder1.id);
		await Tag.addFolder(taga.id, folder2.id);
		await Tag.addFolder(tagb.id, folder2.id);
		await Tag.addFolder(TRASH_TAG_ID, folder2.id);

		let hasFolder = await Tag.hasFolder(taga.id, folder1.id);
		expect(hasFolder).toEqual(true);

		hasFolder = await Tag.hasFolder(tagc.id, folder1.id);
		expect(hasFolder).toEqual(false);

		hasFolder = await Tag.hasFolder(TRASH_TAG_ID, folder1.id);
		expect(hasFolder).toEqual(false);

		hasFolder = await Tag.hasFolder(taga.id, folder2.id);
		expect(hasFolder).toEqual(true);

		hasFolder = await Tag.hasFolder(tagc.id, folder2.id);
		expect(hasFolder).toEqual(false);

		hasFolder = await Tag.hasFolder(TRASH_TAG_ID, folder2.id);
		expect(hasFolder).toEqual(true);
	}));

	it('should untag all notes', asyncTest(async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });

		const tag1 = await Tag.save({ title: 'tag1' });
		const tag2 = await Tag.save({ title: 'tag2' });
		const tag3 = await Tag.save({ title: 'tag3' });

		await Tag.addNote(tag1.id, note1.id);
		await Tag.addNote(tag1.id, note2.id);
		await Tag.addNote(tag2.id, note2.id);

		// check setup
		let noteIds = await Tag.noteIds(tag1.id);
		expect(noteIds.sort()).toEqual(sortedIds([note1, note2]));
		noteIds = await Tag.noteIds(tag2.id);
		expect(noteIds.sort()).toEqual(sortedIds([note2]));
		noteIds = await Tag.noteIds(tag3.id);
		expect(noteIds.sort()).toEqual(sortedIds([]));

		// TEST ACTION
		await Tag.untagAll(tag1.id);

		// check
		let tag = await Tag.load(tag1.id);
		expect(!!tag).toBe(false);
		noteIds = await Tag.noteIds(tag1.id);
		expect(noteIds).toEqual([]);
		let hasNote = await Tag.hasNote(tag1.id, note1.id);
		expect(hasNote).toBe(false);
		hasNote = await Tag.hasNote(tag1.id, note2.id);
		expect(hasNote).toBe(false);
		hasNote = await Tag.hasNote(tag2.id, note2.id);
		expect(hasNote).toBe(true);

		// TEST ACTION
		await Tag.untagAll(tag2.id);

		// check
		tag = await Tag.load(tag2.id);
		expect(!!tag).toBe(false);
		noteIds = await Tag.noteIds(tag2.id);
		expect(noteIds).toEqual([]);
		hasNote = await Tag.hasNote(tag2.id, note1.id);
		expect(hasNote).toBe(false);
		hasNote = await Tag.hasNote(tag2.id, note2.id);
		expect(hasNote).toBe(false);

		// TEST ACTION
		await Tag.untagAll(tag3.id);

		// check
		tag = await Tag.load(tag3.id);
		expect(!!tag).toBe(false);
		noteIds = await Tag.noteIds(tag3.id);
		expect(noteIds).toEqual([]);
		hasNote = await Tag.hasNote(tag3.id, note1.id);
		expect(hasNote).toBe(false);
		hasNote = await Tag.hasNote(tag3.id, note2.id);
		expect(hasNote).toBe(false);
	}));

	// Complete folder tags support is not implemented. Currently it only supports
	// tagging folders with the trash tag. So Tag.untagAll should never be called
	// using a tag on a folder.
	it('should not untag all folders', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const note2 = await Note.save({ title: 'note2', parent_id: folder2.id });

		const tag1 = await Tag.save({ title: 'tag1' });
		const tag2 = await Tag.save({ title: 'tag2' });

		await Tag.addFolder(tag1.id, folder1.id);
		await Tag.addFolder(tag2.id, folder2.id);
		await Tag.addNote(tag2.id, note2.id);

		// check setup
		let noteIds = await Tag.noteIds(tag1.id);
		expect(noteIds).toEqual([]);
		noteIds = await Tag.noteIds(tag2.id);
		expect(noteIds.sort()).toEqual([note2.id]);
		let folderIds = await Tag.folderIds(tag1.id);
		expect(folderIds.sort()).toEqual([folder1.id]);
		folderIds = await Tag.folderIds(tag2.id);
		expect(folderIds.sort()).toEqual([folder2.id]);

		// TEST ACTION
		let hasThrown = await checkThrowAsync(async () => await Tag.untagAll(tag1.id));
		expect(hasThrown).toBe(true);

		// TEST ACTION
		hasThrown = await checkThrowAsync(async () => await Tag.untagAll(tag2.id));
		expect(hasThrown).toBe(true);
	}));

	it('should untag all notes but not delete trash tag', asyncTest(async () => {
		// setup
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });

		await Tag.addNote(TRASH_TAG_ID, note1.id);
		await Tag.addNote(TRASH_TAG_ID, note2.id);

		let noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.sort()).toEqual(sortedIds([note1, note2]));

		// TEST ACTION untag all on notes with trash tag
		await Tag.untagAll(TRASH_TAG_ID);

		// check
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds).toEqual([]);
		const tag = await Tag.load(TRASH_TAG_ID);
		expect(!!tag).toBe(true);

		// setup
		await Tag.addFolder(TRASH_TAG_ID, folder1.id);
		await Tag.addNote(TRASH_TAG_ID, note1.id);

		const folderIds = await Tag.folderIds(TRASH_TAG_ID);
		expect(folderIds.sort()).toEqual(sortedIds([folder1]));
		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.sort()).toEqual(sortedIds([note1]));

		// TEST ACTION untag all on folder with trash tag
		const hasThrown = await checkThrowAsync(
			async () => await Tag.untagAll(TRASH_TAG_ID));
		expect(hasThrown).toBe(true);
	}));
});
