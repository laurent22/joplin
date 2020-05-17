/* eslint-disable no-unused-vars */
require('app-module-path').addPath(__dirname);

const { setupDatabaseAndSynchronizer, switchClient, asyncTest, ids, sortedIds } = require('test-utils.js');
const Tag = require('lib/models/Tag.js');
const Note = require('lib/models/Note.js');
const Folder = require('lib/models/Folder.js');
const NoteTag = require('lib/models/NoteTag.js');
const { applyTagDiff } = require('lib/TagUtils.js');
const { TRASH_TAG_ID, TRASH_TAG_NAME } = require('lib/reserved-ids.js');

describe('utils_Tag', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should apply tag diffs to one note', asyncTest(async () => {
		// set up test scenario
		const folder = await Folder.save({ title: 'folder' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder.id });
		const tag1 = await Tag.save({ title: 'tag1' });

		// check can add tag
		await applyTagDiff([note1.id], [], ['tag1']);

		let tags = await Tag.tagsByNoteId(note1.id);
		expect(sortedIds(tags)).toEqual([tag1.id]);

		// remove tag
		await applyTagDiff([note1.id], ['tag1'], []);

		tags = await Tag.tagsByNoteId(note1.id);
		expect(sortedIds(tags)).toEqual([]);
	}));

	it('should create new tags while applying tag diffs', asyncTest(async () => {
		// set up test scenario
		const folder = await Folder.save({ title: 'folder' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder.id });

		// check can add tag
		await applyTagDiff([note1.id], [], ['tag1']);

		const tag1 = await Tag.loadByTitle('tag1');
		expect(!!tag1).toBe(true);

		let tags = await Tag.tagsByNoteId(note1.id);
		expect(sortedIds(tags)).toEqual([tag1.id]);

		// remove tag
		await applyTagDiff([note1.id], ['tag1'], []);

		tags = await Tag.tagsByNoteId(note1.id);
		expect(sortedIds(tags)).toEqual([]);
	}));

	it('should apply tag diffs to multiple notes', asyncTest(async () => {
		// set up test scenario
		const folder = await Folder.save({ title: 'folder' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder.id });
		const tag1 = await Tag.save({ title: 'tag1' });
		const tag2 = await Tag.save({ title: 'tag2' });
		const tag3 = await Tag.save({ title: 'tag3' });

		// check can add tags
		await applyTagDiff(ids([note1, note2]), [], ['tag1', 'tag2', 'tag3']);

		let tags = await Tag.tagsByNoteId(note1.id);
		expect(sortedIds(tags)).toEqual(sortedIds([tag1, tag2, tag3]));

		tags = await Tag.tagsByNoteId(note2.id);
		expect(sortedIds(tags)).toEqual(sortedIds([tag1, tag2, tag3]));

		// remove tags
		await applyTagDiff(ids([note2, note1]), ['tag1', 'tag2', 'tag3'], ['tag1']);

		tags = await Tag.tagsByNoteId(note1.id);
		expect(sortedIds(tags)).toEqual(sortedIds([tag1]));

		tags = await Tag.tagsByNoteId(note2.id);
		expect(sortedIds(tags)).toEqual(sortedIds([tag1]));
	}));

	it('should apply tag diffs not involving all tags', asyncTest(async () => {
		// set up test scenario
		const folder = await Folder.save({ title: 'folder' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder.id });
		const tag1 = await Tag.save({ title: 'tag1' });
		const tag2 = await Tag.save({ title: 'tag2' });
		const tag3 = await Tag.save({ title: 'tag3' });
		const tag4 = await Tag.save({ title: 'tag4' });
		await Tag.setNoteTagsByIds(note1.id, ids([tag1, tag2]));

		// check can add tags using partial diff
		await applyTagDiff(ids([note1]), ['tag2'], ['tag2', 'tag3']);

		let tags = await Tag.tagsByNoteId(note1.id);
		expect(sortedIds(tags)).toEqual(sortedIds([tag1, tag2, tag3]));

		// remove tags using partial diff
		await applyTagDiff(ids([note1]), ['tag2', 'tag3'], ['tag2']);

		tags = await Tag.tagsByNoteId(note1.id);
		expect(sortedIds(tags)).toEqual(sortedIds([tag1, tag2]));
	}));

	it('should apply tag diffs even when some start tags are not on note', asyncTest(async () => {
		// set up test scenario
		const folder = await Folder.save({ title: 'folder' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder.id });
		const tag1 = await Tag.save({ title: 'tag1' });
		const tag2 = await Tag.save({ title: 'tag2' });
		const tag3 = await Tag.save({ title: 'tag3' });
		const tag4 = await Tag.save({ title: 'tag4' });
		await Tag.setNoteTagsByIds(note1.id, ids([tag1]));

		// check add in the presence of a ghost tag
		await applyTagDiff(ids([note1]), ['tag2'], ['tag2', 'tag3']);

		let tags = await Tag.tagsByNoteId(note1.id);
		expect(sortedIds(tags)).toEqual(sortedIds([tag1, tag3]));

		// check remove in the presence of a ghost tag
		await applyTagDiff(ids([note1]), ['tag4', 'tag3'], ['tag4']);

		tags = await Tag.tagsByNoteId(note1.id);
		expect(sortedIds(tags)).toEqual(sortedIds([tag1]));

		// check removal of a ghost tag - should have no effect has no effect
		await applyTagDiff(ids([note1]), ['tag2'], ['tag3']);

		tags = await Tag.tagsByNoteId(note1.id);
		expect(sortedIds(tags)).toEqual(sortedIds([tag1, tag3]));
	}));

	it('should apply tag diffs to multiple notes with different tags', asyncTest(async () => {
		// set up test scenario
		const folder = await Folder.save({ title: 'folder' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder.id });
		const tag1 = await Tag.save({ title: 'tag1' });
		const tag2 = await Tag.save({ title: 'tag2' });
		const tag3 = await Tag.save({ title: 'tag3' });
		const tag5 = await Tag.save({ title: 'tag5' });
		await Tag.setNoteTagsByIds(note1.id, ids([tag1, tag2]));
		await Tag.setNoteTagsByIds(note2.id, ids([tag1, tag3, tag5]));

		// check can add tags
		await applyTagDiff(ids([note1, note2]), [], ['tag3', 'tag4']);

		const tag4 = await Tag.loadByTitle('tag4');
		expect(!!tag4).toBe(true);

		let tags = await Tag.tagsByNoteId(note1.id);
		expect(sortedIds(tags)).toEqual(sortedIds([tag1, tag2, tag3, tag4]));

		tags = await Tag.tagsByNoteId(note2.id);
		expect(sortedIds(tags)).toEqual(sortedIds([tag1, tag3, tag4, tag5]));

		// remove tags
		await applyTagDiff(ids([note2, note1]), ['tag1', 'tag2', 'tag4', 'tag6'], ['tag6', 'tag1']);

		tags = await Tag.tagsByNoteId(note1.id);
		expect(sortedIds(tags)).toEqual(sortedIds([tag1, tag3]));

		tags = await Tag.tagsByNoteId(note2.id);
		expect(sortedIds(tags)).toEqual(sortedIds([tag1, tag3, tag5]));
	}));

	it('should apply tag diffs on notes with trash tag', asyncTest(async () => {
		// this system tag is assumed to exist
		const trashTag = await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		// set up test scenario
		const folder = await Folder.save({ title: 'folder' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder.id });
		const tag1 = await Tag.save({ title: 'tag1' });
		const tag2 = await Tag.save({ title: 'tag2' });
		const tag3 = await Tag.save({ title: 'tag3' });
		await Tag.setNoteTagsByIds(note1.id, ids([tag1, tag2]));
		await Tag.setNoteTagsByIds(note2.id, ids([tag1, trashTag]));

		// check can add tags
		await applyTagDiff(ids([note1, note2]), [], ['tag3']);

		let tags = await Tag.tagsByNoteId(note1.id);
		expect(sortedIds(tags)).toEqual(sortedIds([tag1, tag2, tag3]));

		tags = await Tag.tagsByNoteId(note2.id);
		expect(sortedIds(tags)).toEqual(sortedIds([tag1, tag3, trashTag]));

		// remove tags
		await applyTagDiff(ids([note2, note1]), ['tag1'], []);

		tags = await Tag.tagsByNoteId(note1.id);
		expect(sortedIds(tags)).toEqual(sortedIds([tag2, tag3]));

		tags = await Tag.tagsByNoteId(note2.id);
		expect(sortedIds(tags)).toEqual(sortedIds([tag3, trashTag]));
	}));

	it('should apply tag diffs involving trash tag', asyncTest(async () => {
		// this system tag is assumed to exist
		const trashTag = await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		// set up test scenario
		const folder = await Folder.save({ title: 'folder' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder.id });
		const tag1 = await Tag.save({ title: 'tag1' });
		const tag2 = await Tag.save({ title: 'tag2' });
		const tag3 = await Tag.save({ title: 'tag3' });
		await Tag.setNoteTagsByIds(note1.id, ids([tag1, tag2]));
		await Tag.setNoteTagsByIds(note2.id, ids([tag1, trashTag]));

		// check can add tags
		await applyTagDiff(ids([note1, note2]), ['tag1'], ['tag3', TRASH_TAG_NAME]);

		let tags = await Tag.tagsByNoteId(note1.id);
		expect(sortedIds(tags)).toEqual(sortedIds([tag2, tag3, trashTag]));

		tags = await Tag.tagsByNoteId(note2.id);
		expect(sortedIds(tags)).toEqual(sortedIds([tag3, trashTag]));

		// remove tags
		await applyTagDiff(ids([note2, note1]), ['tag3', TRASH_TAG_NAME], ['tag1']);

		tags = await Tag.tagsByNoteId(note1.id);
		expect(sortedIds(tags)).toEqual(sortedIds([tag1, tag2]));

		tags = await Tag.tagsByNoteId(note2.id);
		expect(sortedIds(tags)).toEqual(sortedIds([tag1]));
	}));
});
