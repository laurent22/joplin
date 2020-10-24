/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const NoteTag = require('lib/models/NoteTag.js');
const Tag = require('lib/models/Tag.js');
const BaseModel = require('lib/BaseModel.js');
const { shim } = require('lib/shim');

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

	it('should return tags with note counts', asyncTest(async () => {
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

	it('should load individual tags with note count', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'ma 2nd note', parent_id: folder1.id });
		const tag = await Tag.save({ title: 'mytag' });
		await Tag.addNote(tag.id, note1.id);

		let tagWithCount = await Tag.loadWithCount(tag.id);
		expect(tagWithCount.note_count).toBe(1);

		await Tag.addNote(tag.id, note2.id);
		tagWithCount = await Tag.loadWithCount(tag.id);
		expect(tagWithCount.note_count).toBe(2);
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

});
