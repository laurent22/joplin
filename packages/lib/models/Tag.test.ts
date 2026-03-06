import { setupDatabaseAndSynchronizer, switchClient, checkThrowAsync } from '../testing/test-utils';
import Folder from '../models/Folder';
import Note from '../models/Note';
import Tag from '../models/Tag';

describe('models/Tag', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should add tags by title', async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });

		await Tag.setNoteTagsByTitles(note1.id, ['un', 'deux']);

		const noteTags = await Tag.tagsByNoteId(note1.id);
		expect(noteTags.length).toBe(2);
	});

	it('should get the notes associated with a tag', async () => {
		const note1 = await Note.save({});
		const note2 = await Note.save({});
		const note3 = await Note.save({});

		await Tag.setNoteTagsByTitles(note1.id, ['un']);
		await Tag.setNoteTagsByTitles(note2.id, ['un']);
		await Tag.setNoteTagsByTitles(note3.id, ['deux']);

		await Tag.save({ title: 'trois' });

		const tag1 = await Tag.loadByTitle('un');
		const tag2 = await Tag.loadByTitle('deux');
		const tag3 = await Tag.loadByTitle('trois');

		expect((await Tag.noteIds(tag1.id)).sort()).toEqual([note1.id, note2.id].sort());
		expect((await Tag.noteIds(tag2.id)).sort()).toEqual([note3.id].sort());
		expect((await Tag.noteIds(tag3.id)).sort()).toEqual([].sort());

		expect(await Tag.hasNote(tag1.id, note1.id)).toBe(true);
		expect(await Tag.hasNote(tag1.id, note2.id)).toBe(true);
		expect(await Tag.hasNote(tag1.id, note3.id)).toBe(false);
		expect(await Tag.hasNote(tag2.id, note1.id)).toBe(false);
		expect(await Tag.hasNote(tag2.id, note2.id)).toBe(false);
		expect(await Tag.hasNote(tag2.id, note3.id)).toBe(true);
		expect(await Tag.hasNote(tag3.id, note1.id)).toBe(false);
		expect(await Tag.hasNote(tag3.id, note2.id)).toBe(false);
		expect(await Tag.hasNote(tag3.id, note3.id)).toBe(false);

		const notesTag1 = await Tag.notes(tag1.id);
		const notesTag2 = await Tag.notes(tag2.id);
		const notesTag3 = await Tag.notes(tag3.id);
		expect(notesTag1.map(n => n.id).sort()).toEqual([note1.id, note2.id].sort());
		expect(notesTag2.map(n => n.id).sort()).toEqual([note3.id].sort());
		expect(notesTag3.map(n => n.id).sort()).toEqual([].sort());
	});

	it('should not retrieve deleted notes', async () => {
		const note1 = await Note.save({});
		const note2 = await Note.save({});

		await Tag.setNoteTagsByTitles(note1.id, ['un']);
		await Tag.setNoteTagsByTitles(note2.id, ['un']);

		const tag1 = await Tag.loadByTitle('un');

		await Note.delete(note1.id, { toTrash: true });

		expect(await Tag.noteIds(tag1.id)).toEqual([note2.id]);
		expect((await Tag.notes(tag1.id)).map(n => n.id).sort()).toEqual([note2.id]);
		expect(await Tag.hasNote(tag1.id, note1.id)).toBe(false);
		expect(await Tag.hasNote(tag1.id, note2.id)).toBe(true);

		const allWithNotes = await Tag.allWithNotes();
		expect(allWithNotes[0].note_count).toBe(1);
	});

	it('should not allow renaming tag to existing tag names', async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });

		await Tag.setNoteTagsByTitles(note1.id, ['un', 'deux']);

		const tagUn = await Tag.loadByTitle('un');
		const hasThrown = await checkThrowAsync(async () => await Tag.save({ id: tagUn.id, title: 'deux' }, { userSideValidation: true }));

		expect(hasThrown).toBe(true);
	});

	it('should not return tags without notes', async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		await Tag.setNoteTagsByTitles(note1.id, ['un']);

		let tags = await Tag.allWithNotes();
		expect(tags.length).toBe(1);

		await Note.delete(note1.id);

		tags = await Tag.allWithNotes();
		expect(tags.length).toBe(0);
	});

	it('should return tags with note counts', async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'ma 2nd note', parent_id: folder1.id });
		const todo1 = await Note.save({ title: 'todo 1', parent_id: folder1.id, is_todo: 1, todo_completed: 1590085027710 });
		await Tag.setNoteTagsByTitles(note1.id, ['un']);
		await Tag.setNoteTagsByTitles(note2.id, ['un']);
		await Tag.setNoteTagsByTitles(todo1.id, ['un']);

		let tags = await Tag.allWithNotes();
		expect(tags.length).toBe(1);
		expect(tags[0].note_count).toBe(3);
		expect(tags[0].todo_completed_count).toBe(1);

		await Note.delete(todo1.id);

		tags = await Tag.allWithNotes();
		expect(tags.length).toBe(1);
		expect(tags[0].note_count).toBe(2);

		await Note.delete(note1.id);

		tags = await Tag.allWithNotes();
		expect(tags.length).toBe(1);
		expect(tags[0].note_count).toBe(1);

		await Note.delete(note2.id);

		tags = await Tag.allWithNotes();
		expect(tags.length).toBe(0);
	});

	it('should load individual tags with note count', async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'ma note', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'ma 2nd note', parent_id: folder1.id });
		const todo1 = await Note.save({ title: 'todo 2', parent_id: folder1.id, is_todo: 1, todo_completed: 1590085027710 });
		const todo2 = await Note.save({ title: 'todo 2', parent_id: folder1.id, is_todo: 1 });
		const tag = await Tag.save({ title: 'mytag' });
		await Tag.addNote(tag.id, note1.id);

		let tagWithCount = await Tag.loadWithCount(tag.id);
		expect(tagWithCount.note_count).toBe(1);

		await Tag.addNote(tag.id, note2.id);
		tagWithCount = await Tag.loadWithCount(tag.id);
		expect(tagWithCount.note_count).toBe(2);

		await Tag.addNote(tag.id, todo1.id);
		await Tag.addNote(tag.id, todo2.id);
		tagWithCount = await Tag.loadWithCount(tag.id);
		expect(tagWithCount.note_count).toBe(4);
		expect(tagWithCount.todo_completed_count).toBe(1);
	});

	it('should get common tags for set of notes', async () => {
		const folder1 = await Folder.save({ title: 'folder1' });
		const taga = await Tag.save({ title: 'mytaga' });
		const tagb = await Tag.save({ title: 'mytagb' });
		const tagc = await Tag.save({ title: 'mytagc' });
		await Tag.save({ title: 'mytagd' });

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
	});

	it('should allow finding tags when case does not match, for standard ASCII characters', async () => {
		const note1 = await Note.save({});
		await Tag.setNoteTagsByTitles(note1.id, ['Hello']);
		const tag1 = await Tag.loadByTitle('Hello');
		const tag2 = await Tag.loadByTitle('hello');
		expect(tag1).toStrictEqual(tag2);
	});

	it('should find separate tags when case does not match, for special Unicode characters', async () => {
		const note1 = await Note.save({});
		await Tag.setNoteTagsByTitles(note1.id, ['Ökonomie']);
		await Tag.setNoteTagsByTitles(note1.id, ['ökonomie']);
		const tag1 = await Tag.loadByTitle('Ökonomie');
		const tag2 = await Tag.loadByTitle('ökonomie');
		expect(tag1).not.toBe(undefined);
		expect(tag2).not.toBe(undefined);
		expect(tag1).not.toStrictEqual(tag2);
	});

	// Tests for issue #14540 - duplicate tag creation fix
	it('should not create duplicate tags when adding the same tag with different cases', async () => {
		const note1 = await Note.save({});
		
		// Add same tag with different cases
		await Tag.setNoteTagsByTitles(note1.id, ['test', 'Test', 'TEST']);
		
		// Should only have one tag linked to the note
		const tags = await Tag.tagsByNoteId(note1.id);
		expect(tags.length).toBe(1);
		expect(tags[0].title).toBe('test');
	});

	it('should not create duplicate tags within a single setNoteTagsByTitles call', async () => {
		const note1 = await Note.save({});
		
		// Add duplicate tag titles in the same call
		await Tag.setNoteTagsByTitles(note1.id, ['mytag', 'mytag', 'mytag']);
		
		// Should only have one tag linked to the note
		const tags = await Tag.tagsByNoteId(note1.id);
		expect(tags.length).toBe(1);
		expect(tags[0].title).toBe('mytag');
	});

	it('should reuse existing tags when adding a duplicate tag', async () => {
		const note1 = await Note.save({});
		const note2 = await Note.save({});
		
		// Add tag to first note
		await Tag.setNoteTagsByTitles(note1.id, ['shared-tag']);
		const tag1 = await Tag.loadByTitle('shared-tag');
		
		// Add same tag to second note
		await Tag.setNoteTagsByTitles(note2.id, ['shared-tag']);
		const tag2 = await Tag.loadByTitle('shared-tag');
		
		// Should be the same tag
		expect(tag1.id).toBe(tag2.id);
		
		// Only one tag should exist in the database
		const allTags = await Tag.allWithNotes();
		expect(allTags.filter(t => t.title.toLowerCase() === 'shared-tag').length).toBe(1);
	});

	it('should handle deduplication with multiple tags', async () => {
		const note1 = await Note.save({});
		
		// Add multiple tags with some duplicates
		await Tag.setNoteTagsByTitles(note1.id, ['tag1', 'tag2', 'tag1', 'tag3', 'tag2', 'tag1']);
		
		// Should only have 3 unique tags linked to the note
		const tags = await Tag.tagsByNoteId(note1.id);
		expect(tags.length).toBe(3);
		
		const tagTitles = tags.map(t => t.title).sort();
		expect(tagTitles).toEqual(['tag1', 'tag2', 'tag3']);
	});

	it('should preserve first occurrence casing when deduplicating', async () => {
		const note1 = await Note.save({});
		
		// Add tag with specific casing
		await Tag.setNoteTagsByTitles(note1.id, ['MyTag', 'MYTAG', 'mytag']);
		
		// Should preserve the first occurrence's casing
		const tags = await Tag.tagsByNoteId(note1.id);
		expect(tags.length).toBe(1);
		expect(tags[0].title).toBe('MyTag');
	});

	it('should correctly link tags to note after deduplication', async () => {
		const note1 = await Note.save({});
		
		// Add deduplicated tags
		await Tag.setNoteTagsByTitles(note1.id, ['tag1', 'tag1']);
		const tag1 = await Tag.loadByTitle('tag1');
		
		// Verify the note is correctly linked to the tag
		expect(await Tag.hasNote(tag1.id, note1.id)).toBe(true);
		
		// Verify the tag's note count
		const tagWithCount = await Tag.loadWithCount(tag1.id);
		expect(tagWithCount.note_count).toBe(1);
	});

	it('should handle switching between different tag sets with duplicates', async () => {
		const note1 = await Note.save({});
		
		// First set of tags with duplicates
		await Tag.setNoteTagsByTitles(note1.id, ['tag1', 'tag1', 'tag2']);
		let tags = await Tag.tagsByNoteId(note1.id);
		expect(tags.length).toBe(2);
		
		// Switch to different set with duplicates
		await Tag.setNoteTagsByTitles(note1.id, ['tag2', 'tag3', 'tag3']);
		tags = await Tag.tagsByNoteId(note1.id);
		expect(tags.length).toBe(2);
		
		const tagTitles = tags.map(t => t.title).sort();
		expect(tagTitles).toEqual(['tag2', 'tag3']);
	});

	it('should not create tags that are just whitespace', async () => {
		const note1 = await Note.save({});
		
		// Add whitespace-only tags
		await Tag.setNoteTagsByTitles(note1.id, ['  ', '\t', '\n', 'validtag']);
		
		// Should only have one tag linked to the note
		const tags = await Tag.tagsByNoteId(note1.id);
		expect(tags.length).toBe(1);
		expect(tags[0].title).toBe('validtag');
	});

	it('should handle case-insensitive deduplication with trim', async () => {
		const note1 = await Note.save({});
		
		// Add tags with whitespace and different cases
		await Tag.setNoteTagsByTitles(note1.id, [' tag1 ', 'TAG1', '  tag1  ']);
		
		// Should only have one tag
		const tags = await Tag.tagsByNoteId(note1.id);
		expect(tags.length).toBe(1);
		// First occurrence after trim should be ' tag1 '.trim() = 'tag1'
		expect(tags[0].title).toBe('tag1');
	});
});

