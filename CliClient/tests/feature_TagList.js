/* eslint-disable no-unused-vars */
require('app-module-path').addPath(__dirname);
const { setupDatabaseAndSynchronizer, switchClient, asyncTest, sortedIds, createNTestFolders, createNTestNotes, createNTestTags } = require('test-utils.js');
const { TestApp, actions } = require('test-feature-utils.js');
const Setting = require('lib/models/Setting.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const { time } = require('lib/time-utils.js');
const { ALL_NOTES_FILTER_ID, TRASH_FILTER_ID, TRASH_TAG_ID, CONFLICT_FOLDER_ID } = require('lib/reserved-ids.js');

let testApp = null;

describe('feature_TagList', function() {

	beforeEach(async (done) => {
		testApp = new TestApp();
		await testApp.start(['--no-welcome']);
		actions.setApp(testApp);
		done();
	});

	afterEach(async (done) => {
		actions.setApp(null);
		if (testApp !== null) await testApp.destroy();
		testApp = null;
		done();
	});

	// the tag list should be cleared if the next note has no tags
	it('should clear tag list when a note is deleted', asyncTest(async () => {
		// setup and select the note
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(5, folders[0].id);
		const tags = await createNTestTags(3);
		await testApp.wait();

		await Tag.addNote(tags[2].id, notes[2].id);
		await testApp.wait();

		await actions.viewFolder(folders[0].id);
		await actions.selectNotes([notes[2].id]);

		// check the tag list is correct
		let state = testApp.store().getState();
		expect(state.selectedNoteTags.length).toEqual(1);
		expect(state.selectedNoteTags[0].id).toEqual(tags[2].id);

		// TEST ACTION
		await actions.deleteSelectedNotes();

		// check the tag list is updated
		state = testApp.store().getState();
		expect(state.selectedNoteTags.length).toEqual(0);
	}));

	// the tag list should be updated if the next note has tags
	it('should update tag list when a note is deleted', asyncTest(async () => {
		// set up and select the note
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(5, folders[0].id);
		const tags = await createNTestTags(3);
		await testApp.wait();

		await Tag.addNote(tags[1].id, notes[1].id);
		await Tag.addNote(tags[0].id, notes[0].id);
		await Tag.addNote(tags[2].id, notes[0].id);
		await testApp.wait();

		await actions.viewFolder(folders[0].id);
		await actions.selectNotes([notes[1].id]);

		// check the tag list is correct
		let state = testApp.store().getState();
		expect(state.selectedNoteTags.length).toEqual(1);
		expect(state.selectedNoteTags[0].id).toEqual(tags[1].id);

		// delete the note
		await actions.deleteSelectedNotes();

		// check the tag list is updated
		state = testApp.store().getState();
		const tagIds = state.selectedNoteTags.map(n => n.id).sort();
		const expectedTagIds = [tags[0].id, tags[2].id].sort();
		expect(state.selectedNoteTags.length).toEqual(2);
		expect(tagIds).toEqual(expectedTagIds);
	}));

	it('should show the trash tag only in conflicts and not elsewhere', asyncTest(async () => {
		const folder = await Folder.save({ title: 'folder' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder.id });
		await time.msleep(10);
		const note2 = await Note.save({ title: 'note2', parent_id: folder.id, is_conflict: 1 });
		await time.msleep(10);
		const note3 = await Note.save({ title: 'note3', parent_id: folder.id });
		await time.msleep(10);
		const note4 = await Note.save({ title: 'note4', parent_id: folder.id, is_conflict: 1 });
		await testApp.wait();
		await Tag.setNoteTagsByIds(note3.id, [TRASH_TAG_ID]);
		await Tag.setNoteTagsByIds(note4.id, [TRASH_TAG_ID]);
		await actions.awaitFoldersRefresh();

		// check in folder
		await actions.viewFolder(folder.id);
		await actions.selectNotes([note1.id]);

		let state = testApp.store().getState();
		expect(state.selectedNoteTags.length).toEqual(0);

		// check in trash
		await actions.viewFilter(TRASH_FILTER_ID);
		await actions.selectNotes([note3.id]);

		state = testApp.store().getState();
		expect(state.selectedNoteTags.length).toEqual(0);

		// check in all notes
		await actions.viewFilter(ALL_NOTES_FILTER_ID);
		await actions.selectNotes([note1.id]);

		state = testApp.store().getState();
		expect(state.selectedNoteTags.length).toEqual(0);

		// check in conflicts
		await actions.viewFolder(CONFLICT_FOLDER_ID);
		await actions.selectNotes([note2.id]);

		state = testApp.store().getState();
		expect(state.selectedNoteTags.length).toEqual(0);

		await actions.selectNotes([note4.id]);

		state = testApp.store().getState();
		expect(state.selectedNoteTags.length).toEqual(1);
		expect(state.selectedNoteTags[0].id).toEqual(TRASH_TAG_ID);
	}));

	it('should update taglist on restore note from trash', asyncTest(async () => {
		// set up
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(4, folders[0].id, [TRASH_TAG_ID]);
		await Tag.addNoteTagByTitle(notes[1].id, 'tag');
		const tag = await Tag.loadByTitle('tag');
		await testApp.wait();
		await actions.viewFilter(TRASH_FILTER_ID);
		await actions.selectNotes([notes[1].id]);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(sortedIds(state.selectedNoteTags)).toEqual([tag.id]);

		// TEST ACTION
		await actions.restoreSelectedNotes();

		// check tag list is updated
		state = testApp.store().getState();
		expect(sortedIds(state.selectedNoteTags)).toEqual([]);
	}));

	it('should update taglist when move note to trash from folder', asyncTest(async () => {
		// set up
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(4, folders[0].id);
		await Tag.addNoteTagByTitle(notes[1].id, 'tag');
		const tag = await Tag.loadByTitle('tag');
		await testApp.wait();
		await actions.viewFolder(folders[0].id);
		await actions.selectNotes([notes[1].id]);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(sortedIds(state.selectedNoteTags)).toEqual([tag.id]);

		// TEST ACTION
		await actions.deleteSelectedNotes();

		// check tag list is updated
		state = testApp.store().getState();
		expect(sortedIds(state.selectedNoteTags)).toEqual([]);
	}));

	it('should update taglist when move note to trash from all-notes', asyncTest(async () => {
		// set up
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(4, folders[0].id);
		await Tag.addNoteTagByTitle(notes[1].id, 'tag');
		const tag = await Tag.loadByTitle('tag');
		await testApp.wait();
		await actions.viewFilter(ALL_NOTES_FILTER_ID);
		await actions.selectNotes([notes[1].id]);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(sortedIds(state.selectedNoteTags)).toEqual([tag.id]);

		// TEST ACTION
		await actions.deleteSelectedNotes();

		// check tag list is updated
		state = testApp.store().getState();
		expect(sortedIds(state.selectedNoteTags)).toEqual([]);
	}));

	it('should update taglist when move note to trash from conflicts', asyncTest(async () => {
		// set up
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(4, folders[0].id, null, 'Note', 1);
		await Tag.addNoteTagByTitle(notes[1].id, 'tag');
		const tag = await Tag.loadByTitle('tag');
		await actions.awaitFoldersRefresh();
		await actions.viewFolder(CONFLICT_FOLDER_ID);
		await actions.selectNotes([notes[1].id]);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(sortedIds(state.selectedNoteTags)).toEqual([tag.id]);

		// TEST ACTION
		await actions.deleteSelectedNotes();

		// check tag list is updated
		state = testApp.store().getState();
		expect(sortedIds(state.selectedNoteTags)).toEqual([]);
	}));

	it('should update taglist when permanently delete note from folder', asyncTest(async () => {
		// set up
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(4, folders[0].id);
		await Tag.addNoteTagByTitle(notes[1].id, 'tag');
		const tag = await Tag.loadByTitle('tag');
		await testApp.wait();
		await actions.viewFolder(folders[0].id);
		await actions.selectNotes([notes[1].id]);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(sortedIds(state.selectedNoteTags)).toEqual([tag.id]);

		// TEST ACTION
		await actions.permanentlyDeleteSelectedNotes();

		// check tag list is updated
		state = testApp.store().getState();
		expect(sortedIds(state.selectedNoteTags)).toEqual([]);
	}));

	it('should update taglist when permanently delete note from all-notes', asyncTest(async () => {
		// set up
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(4, folders[0].id);
		await Tag.addNoteTagByTitle(notes[1].id, 'tag');
		const tag = await Tag.loadByTitle('tag');
		await testApp.wait();
		await actions.viewFilter(ALL_NOTES_FILTER_ID);
		await actions.selectNotes([notes[1].id]);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(sortedIds(state.selectedNoteTags)).toEqual([tag.id]);

		// TEST ACTION
		await actions.permanentlyDeleteSelectedNotes();

		// check tag list is updated
		state = testApp.store().getState();
		expect(sortedIds(state.selectedNoteTags)).toEqual([]);
	}));

	it('should update taglist when delete note from conflicts', asyncTest(async () => {
		// set up
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(4, folders[0].id, null, 'Note', 1);
		await Tag.addNoteTagByTitle(notes[1].id, 'tag');
		const tag = await Tag.loadByTitle('tag');
		await actions.awaitFoldersRefresh();
		await actions.viewFolder(CONFLICT_FOLDER_ID);
		await actions.selectNotes([notes[1].id]);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(sortedIds(state.selectedNoteTags)).toEqual([tag.id]);

		// TEST ACTION
		await actions.permanentlyDeleteSelectedNotes();

		// check tag list is updated
		state = testApp.store().getState();
		expect(sortedIds(state.selectedNoteTags)).toEqual([]);
	}));
});
