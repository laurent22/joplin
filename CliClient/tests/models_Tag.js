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

	it('should return correct note counts', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'ma 2nd note', parent_id: folder1.id });
		await Tag.setNoteTagsByTitles(note1.id, ['un']);
		await Tag.setNoteTagsByTitles(note2.id, ['un']);

		let tags = await Tag.allWithNotes();
		expect(tags.length).toBe(1);
		expect(Tag.getCachedNoteCount(tags[0].id)).toBe(2);

		await Note.delete(note1.id);

		tags = await Tag.allWithNotes();
		expect(tags.length).toBe(1);
		expect(Tag.getCachedNoteCount(tags[0].id)).toBe(1);

		await Note.delete(note2.id);

		tags = await Tag.allWithNotes();
		expect(tags.length).toBe(0);
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

	it('should create parent tags', asyncTest(async () => {
		const tag = await Tag.saveNested({}, 'tag1/subtag1/subtag2');
		expect(tag).not.toEqual(null);

		let parent_tag = await Tag.loadByTitle('tag1/subtag1');
		expect(parent_tag).not.toEqual(null);

		parent_tag = await Tag.loadByTitle('tag1');
		expect(parent_tag).not.toEqual(null);
	}));

	it('should should find notes tagged with descendant tag', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const tag0 = await Tag.saveNested({}, 'tag1/subtag1/subsubtag');
		const tag1 = await Tag.loadByTitle('tag1/subtag1');

		const note0 = await Note.save({ title: 'my note 0', parent_id: folder1.id });
		const note1 = await Note.save({ title: 'my note 1', parent_id: folder1.id });

		await Tag.addNote(tag0.id, note0.id);
		await Tag.addNote(tag1.id, note1.id);

		const parent_tag = await Tag.loadByTitle('tag1');
		const noteIds = await Tag.noteIds(parent_tag.id);
		expect(noteIds.includes(note0.id)).toBe(true);
		expect(noteIds.includes(note1.id)).toBe(true);
	}));

	it('should untag descendant tags', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const tag0 = await Tag.saveNested({}, 'tag1/subtag1/subsubtag');
		const parent_tag = await Tag.loadByTitle('tag1');
		const note0 = await Note.save({ title: 'my note 0', parent_id: folder1.id });

		await Tag.addNote(tag0.id, note0.id);
		let tagIds = await NoteTag.tagIdsByNoteId(note0.id);
		expect(tagIds.includes(tag0.id)).toBe(true);

		await Tag.untagAll(parent_tag.id);
		tagIds = await NoteTag.tagIdsByNoteId(note0.id);
		expect(tagIds.length).toBe(0);
	}));

	it('should count note_tags of descendant tags', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const tag0 = await Tag.saveNested({}, 'tag1/subtag1/subsubtag');
		let parent_tag = await Tag.loadByTitle('tag1');

		const note0 = await Note.save({ title: 'my note 0', parent_id: folder1.id });
		await Tag.addNote(tag0.id, note0.id);

		parent_tag = await Tag.loadWithCount(parent_tag.id);
		expect(Tag.getCachedNoteCount(parent_tag.id)).toBe(1);
	}));

	it('should delete descendant tags', asyncTest(async () => {
		let tag1 = await Tag.saveNested({}, 'tag1/subtag1/subsubtag');
		let tag1_subtag1 = await Tag.loadByTitle('tag1/subtag1');
		expect(tag1).toBeDefined();
		expect(tag1_subtag1).toBeDefined();

		let parent_tag = await Tag.loadByTitle('tag1');
		await Tag.delete(parent_tag.id);

		parent_tag = await Tag.loadByTitle('tag1');
		expect(parent_tag).not.toBeDefined();
		tag1_subtag1 = await Tag.loadByTitle('tag1/subtag1');
		expect(tag1_subtag1).not.toBeDefined();
		tag1 = await Tag.loadByTitle('tag1/subtag1/subsubtag');
		expect(tag1).not.toBeDefined();
	}));

	it('should delete noteless parent tags', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note0 = await Note.save({ title: 'my note 0', parent_id: folder1.id });
		const subsubtag = await Tag.saveNested({}, 'tag1/subtag1/subsubtag');
		await Tag.addNote(subsubtag.id, note0.id);
		let tag1_subtag1 = await Tag.loadByTitle('tag1/subtag1');

		// This will remove the link from tag1 to subsubtag1 (which is removed)
		// So tag1 is noteless and should also be removed
		await Tag.delete(tag1_subtag1.id);

		const parent_tag = await Tag.loadByTitle('tag1');
		expect(parent_tag).not.toBeDefined();
		tag1_subtag1 = await Tag.loadByTitle('tag1/subtag1');
		expect(tag1_subtag1).not.toBeDefined();
		const tag1 = await Tag.loadByTitle('tag1/subtag1/subsubtag');
		expect(tag1).not.toBeDefined();
	}));

	it('renaming should change prefix in descendant tags', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note0 = await Note.save({ title: 'my note 0', parent_id: folder1.id });

		const tag1 = await Tag.saveNested({}, 'tag1/subtag1/subsubtag');
		const subtag2 = await Tag.saveNested({}, 'tag1/subtag2');
		const subtag1 = await Tag.loadByTitle('tag1/subtag1');
		const tag1_parent = await Tag.loadByTitle('tag1');

		await Tag.setNoteTagsByIds(note0.id, [tag1.id, subtag2.id]);
		await Tag.renameNested(tag1_parent, 'tag2');

		expect(Tag.getCachedFullTitle((await Tag.loadWithCount(tag1_parent.id)).id)).toBe('tag2');
		expect(Tag.getCachedFullTitle((await Tag.loadWithCount(tag1.id)).id)).toBe('tag2/subtag1/subsubtag');
		expect(Tag.getCachedFullTitle((await Tag.loadWithCount(subtag1.id)).id)).toBe('tag2/subtag1');
		expect(Tag.getCachedFullTitle((await Tag.loadWithCount(subtag2.id)).id)).toBe('tag2/subtag2');
	}));

	it('renaming parent prefix should branch-out to two hierarchies', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'my note 1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'my note 2', parent_id: folder1.id });
		const subsubtag1 = await Tag.saveNested({}, 'tag1/subtag1/subsubtag1');
		const subsubtag2 = await Tag.saveNested({}, 'tag1/subtag1/subsubtag2');
		await Tag.addNote(subsubtag1.id, note1.id);
		await Tag.addNote(subsubtag2.id, note2.id);

		await Tag.renameNested(subsubtag1, 'tag1/subtag2/subsubtag1');

		const subtag1 = await Tag.loadByTitle('tag1/subtag1');
		const subtag2 = await Tag.loadByTitle('tag1/subtag2');
		expect(subtag1).toBeDefined();
		expect(subtag2).toBeDefined();
	}));

	it('renaming parent prefix to existing tag should remove unused old tag', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'my note 1', parent_id: folder1.id });
		const subsubtag1 = await Tag.saveNested({}, 'tag1/subtag1/subsubtag1');
		const subsubtag2 = await Tag.saveNested({}, 'tag1/subtag2/subsubtag2');
		await Tag.addNote(subsubtag2.id, note1.id);

		await Tag.renameNested(subsubtag1, 'tag1/subtag2/subsubtag1');

		expect((await Tag.loadByTitle('tag1/subtag1'))).not.toBeDefined();
	}));

	it('moving tag should change prefix name', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'my note 1', parent_id: folder1.id });
		const subsubtag1 = await Tag.saveNested({}, 'tag1/subtag1/subsubtag1');
		const tag2 = await Tag.saveNested({}, 'tag2');
		await Tag.setNoteTagsByIds(note1.id, [tag2.id, subsubtag1.id]);

		await Tag.moveTag(subsubtag1.id, tag2.id);

		expect(Tag.getCachedFullTitle((await Tag.loadWithCount(subsubtag1.id)).id)).toBe('tag2/subsubtag1');
	}));

	it('moving tag to itself or its descendant throws error', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'my note 1', parent_id: folder1.id });
		const subsubtag1 = await Tag.saveNested({}, 'tag1/subtag1/subsubtag1');
		await Tag.addNote(subsubtag1.id, note1.id);

		const tag1 = await Tag.loadByTitle('tag1');

		let hasThrown = await checkThrowAsync(async () => await Tag.moveTag(tag1.id, subsubtag1.id));
		expect(hasThrown).toBe(true);
		hasThrown = await checkThrowAsync(async () => await Tag.moveTag(tag1.id, tag1.id));
		expect(hasThrown).toBe(true);
	}));

	it('renaming tag as a child of itself creates new parent', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'my note 1', parent_id: folder1.id });
		const subtag1 = await Tag.saveNested({}, 'tag1/subtag1');
		await Tag.addNote(subtag1.id, note1.id);

		const a = await Tag.renameNested(subtag1, 'tag1/subtag1/a/subtag1');

		const subtag1_renamed = await Tag.loadByTitle('tag1/subtag1/a/subtag1');
		expect(subtag1_renamed.id).toBe(subtag1.id);
		const subtag1_new = await Tag.loadByTitle('tag1/subtag1');
		expect(subtag1_new.id).not.toBe(subtag1.id);
	}));

	it('should search by full title regex', asyncTest(async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'my note 1', parent_id: folder1.id });
		const abc = await Tag.saveNested({}, 'a/b/c');
		const adef = await Tag.saveNested({}, 'a/d/e/f');

		await Tag.setNoteTagsByIds(note1.id, [abc.id, adef.id]);

		expect((await Tag.search({ fullTitleRegex: '.*c.*' })).length).toBe(1);
		expect((await Tag.search({ fullTitleRegex: '.*b.*' })).length).toBe(2);
		expect((await Tag.search({ fullTitleRegex: '.*b/c.*' })).length).toBe(1);
		expect((await Tag.search({ fullTitleRegex: '.*a.*' })).length).toBe(6);
		expect((await Tag.search({ fullTitleRegex: '.*a/d.*' })).length).toBe(3);
	}));

	it('creating tags with the same name at the same level should throw exception', asyncTest(async () => {
		// Should not complain when creating at different levels
		await Tag.saveNested({}, 'a/b/c');
		await Tag.saveNested({}, 'a/d/e/c');
		await Tag.saveNested({}, 'c');

		// Should complain when creating at the same level
		let hasThrown = await checkThrowAsync(async () => await Tag.saveNested({}, 'a/d', { userSideValidation: true }));
		expect(hasThrown).toBe(true);
		hasThrown = await checkThrowAsync(async () => await Tag.saveNested({}, 'a', { userSideValidation: true }));
		expect(hasThrown).toBe(true);
		hasThrown = await checkThrowAsync(async () => await Tag.saveNested({}, 'a/b/c', { userSideValidation: true }));
		expect(hasThrown).toBe(true);
	}));
});
