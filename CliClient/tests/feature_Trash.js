/* eslint-disable no-unused-vars */
require('app-module-path').addPath(__dirname);
const { setupDatabaseAndSynchronizer, switchClient, asyncTest, checkThrowAsync, id, ids, sortedIds, at, createNTestNotes, createNTestFolders, createNTestTags, createNTestTodos } = require('test-utils.js');
const { TestApp, actions } = require('test-feature-utils.js');
const Setting = require('lib/models/Setting.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const NoteTag = require('lib/models/NoteTag.js');
const SearchEngine = require('lib/services/SearchEngine');
const { time } = require('lib/time-utils.js');
const { ALL_NOTES_FILTER_ID, TRASH_FILTER_ID, TRASH_TAG_ID, TRASH_TAG_NAME, ORPHANS_FOLDER_ID, CONFLICT_FOLDER_ID } = require('lib/reserved-ids.js');

// use this until Javascript arr.flat() function works in Travis
function flatten(a) {
	return (a.reduce((acc, val) => acc.concat(val), []));
}

let testApp = null;

describe('feature_Trash', function() {

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

	it('should move a note to trash and restore it', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(3, folders[0].id);
		await actions.viewFolder(folders[0].id);
		await actions.selectNotes([notes[1].id]);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes[1]]));
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes));

		// TEST ACTION: Delete a single note from the folder
		await actions.deleteSelectedNotes();

		// check: the note should no longer exist in its parent folder
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(id(folders[0]));
		expect(sortedIds(state.notes)).toEqual(sortedIds(at(notes, [0,2])));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes[0]]));

		// check: the note should exist in the trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(TRASH_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds([notes[1]]));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes[1]]));

		// TEST ACTION: Restore the note from the trash
		await actions.restoreSelectedNotes();

		// check: the note should no longer exist in the trash
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(TRASH_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual([]);
		expect(state.selectedNoteIds.length).toEqual(0);

		// check: the note is returned to its parent folder
		await actions.viewFolder(folders[0].id);
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(id(folders[0]));
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes[1]]));
	}));

	it('should move multiple notes to trash and restore them', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(2);
		const notes = [];
		for (let i = 0; i < folders.length; i++) {
			notes.push(await createNTestNotes(4, folders[i].id));
		}
		await actions.viewFolder(folders[1].id);
		await actions.selectNotes(ids([notes[1][0], notes[1][2], notes[1][3]]));

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds(at(notes[1], [0,2,3])));
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes[1]));

		// TEST ACTION: Delete multiple notes (but not all of them) from a folder
		await actions.deleteSelectedNotes();

		// check: the notes should no longer exist in their parent folder
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(id(folders[1]));
		expect(state.selectedNoteIds[0]).toEqual(id(notes[1][1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([notes[1][1]]));

		// check: the notes should exist in the trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(TRASH_FILTER_ID);
		expect(state.selectedNoteIds).toEqual(sortedIds([notes[1][3]]));
		expect(sortedIds(state.notes)).toEqual(sortedIds(at(notes[1], [0,2,3])));

		// TEST ACTION: Restore multiple notes (but not all of them) from trash
		await actions.selectNotes(ids(at(notes[1], [2,3])));
		await actions.restoreSelectedNotes();

		// check: the restored notes should not exist in the trash folder
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(TRASH_FILTER_ID);
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes[1][0]]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([notes[1][0]]));

		// check: the restored notes are returned to their parent folder
		await actions.viewFolder(folders[1].id);
		await testApp.wait();
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(id(folders[1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds(at(notes[1], [1,2,3])));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes[1][2]])); // is this the wrong note?
	}));

	it('should a lot of notes to trash and restore them', asyncTest(async () => {
		// setup
		const folder = await Folder.save({ title: 'folder' });
		const notes = await createNTestNotes(101, folder.id);

		await actions.viewFolder(folder.id);
		await actions.selectNotes(ids(notes));

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds(notes));
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes));

		// TEST ACTION: Delete multiple notes from a folder
		await actions.deleteSelectedNotes();

		// check: the notes should no longer exist in their parent folder
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(id(folder));
		expect(state.selectedNoteIds).toEqual([]);
		expect(sortedIds(state.notes)).toEqual([]);

		// check: the notes should exist in the trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(TRASH_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes));

		// TEST ACTION: Restore multiple notes from trash
		await actions.selectNotes(ids(notes));
		await actions.restoreSelectedNotes();

		// check: the restored notes should not exist in the trash folder
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(TRASH_FILTER_ID);
		expect(state.selectedNoteIds).toEqual([]);
		expect(sortedIds(state.notes)).toEqual([]);

		// check: the restored notes are returned to their parent folder
		await actions.viewFolder(folder.id);
		await testApp.wait();
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(id(folder));
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes));
	}));

	it('should move a note to trash from all-notes', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(2);
		const notes = [];
		for (let i = 0; i < folders.length; i++) {
			notes.push(await createNTestNotes(4, folders[i].id, null, `note${i}.`));
		}
		await testApp.wait();
		await actions.viewFilter(ALL_NOTES_FILTER_ID);
		await actions.selectNotes(ids([notes[0][0], notes[1][1]]));

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(flatten(notes)));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes[0][0], notes[1][1]]));

		// TEST ACTION: Delete a lot notesfrom all-notes
		await actions.deleteSelectedNotes();

		// check: the deleted notes should no longer exist in all-notes
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(ALL_NOTES_FILTER_ID);
		const trashedNoteIds = ids([notes[0][0], notes[1][1]]);
		let remainingNoteIds = ids(flatten(notes));
		remainingNoteIds = remainingNoteIds.filter(n => !trashedNoteIds.includes(n));
		expect(sortedIds(state.notes)).toEqual(remainingNoteIds.sort());
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes[0][1]]));

		// check: the deleted notes no longer exist in their parent folder
		await actions.viewFolder(folders[1].id);
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(id(folders[1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds(at(notes[1], [0,2,3])));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes[1][3]]));

		// check: the deleted notes exist in the trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(TRASH_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(trashedNoteIds.sort());
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes[1][1]]));

		// TEST ACTION: Restore the notes from the trash
		await actions.selectNotes(trashedNoteIds);
		await actions.restoreSelectedNotes();

		// check: the restored notes should no longer exist in the trash
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(TRASH_FILTER_ID);
		expect(state.notes.length).toEqual(0);
		expect(state.selectedNoteIds.length).toEqual(0);

		// check: the restored notes should be returned to all-notes
		await actions.viewFilter(ALL_NOTES_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(flatten(notes)));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes[1][3]]));

		// check: the restored notes should be returned to their parent folder
		await actions.viewFolder(folders[1].id);
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(id(folders[1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes[1]));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes[1][3]]));
	}));

	it('should permanently delete note from trash', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(2);
		const notes0 = await createNTestNotes(3, folders[0].id);
		const notes1 = await createNTestNotes(3, folders[1].id);
		const trashNotes = await createNTestNotes(3, folders[0].id, [TRASH_TAG_ID]);
		const deleteNotes = await createNTestNotes(3, folders[0].id, [TRASH_TAG_ID]);
		await testApp.wait();

		await actions.viewFilter(TRASH_FILTER_ID);
		await actions.selectNotes(ids(deleteNotes));

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(trashNotes.concat(deleteNotes)));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds(deleteNotes));

		// TEST ACTION: Permanently delete some notes from the trash
		await actions.permanentlyDeleteSelectedNotes();

		// check: the deleted notes no longer exist in the trash
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(TRASH_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds(trashNotes));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([trashNotes[2]]));

		// check: the deleted notes do not exist in their parent folder
		await actions.viewFolder(id(folders[0]));
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(id(folders[0]));
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes0[2]]));

		// check the deleted notes no longer exist in all notes
		await actions.viewFilter(ALL_NOTES_FILTER_ID);
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(ALL_NOTES_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0.concat(notes1)));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes0[2]])); // selection retained
	}));

	it('should permanently delete note from a folder', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(2);
		const notes0 = await createNTestNotes(3, folders[0].id);
		const notes1 = await createNTestNotes(3, folders[1].id);
		const trashNotes = await createNTestNotes(3, folders[0].id, [TRASH_TAG_ID]);
		const deleteNotes = await createNTestNotes(3, folders[0].id);
		await testApp.wait();
		await actions.viewFolder(id(folders[0]));

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(id(folders[0]));
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0.concat(deleteNotes)));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([deleteNotes[2]]));

		// TEST ACTION: Permanently delete some notes from the folder
		await actions.selectNotes(ids(deleteNotes));
		await actions.permanentlyDeleteSelectedNotes();

		// check: the deleted notes no longer exist in the folder
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(id(folders[0]));
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes0[2]]));

		// check: the deleted notes do not exist in the trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(TRASH_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds(trashNotes));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([trashNotes[2]]));

		// check the deleted notes no longer exist in all-notes
		await actions.viewFilter(ALL_NOTES_FILTER_ID);
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(ALL_NOTES_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0.concat(notes1)));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes1[2]]));
	}));

	it('should permanently delete note from all-notes', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(2);
		const notes0 = await createNTestNotes(3, folders[0].id);
		const notes1 = await createNTestNotes(3, folders[1].id);
		const trashNotes = await createNTestNotes(3, folders[0].id, [TRASH_TAG_ID]);
		const deleteNotes = await createNTestNotes(3, folders[0].id);
		await testApp.wait();
		await actions.viewFilter(ALL_NOTES_FILTER_ID);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0.concat(notes1).concat(deleteNotes)));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([deleteNotes[2]]));

		// TEST ACTION: Permanently delete some notes from all-notes
		await actions.selectNotes(ids(deleteNotes));
		await actions.permanentlyDeleteSelectedNotes();

		// check: the deleted notes no longer exist in all-notes
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(ALL_NOTES_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0.concat(notes1)));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes1[2]]));

		// check the deleted notes no longer exist in the trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(TRASH_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds(trashNotes));
		expect(state.selectedNoteIds).toEqual(sortedIds([trashNotes[2]]));

		// check: the deleted notes do not exist in their parent folder
		await actions.viewFolder(id(folders[0]));
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(id(folders[0]));
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes0[2]]));
	}));

	it('should leave note tags unaffected', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(1);
		const tags = await createNTestTags(2);
		let notes = await createNTestNotes(1, folders[0].id);
		notes = notes.concat(await createNTestNotes(1, folders[0].id, ids([tags[0]])));
		notes = notes.concat(await createNTestNotes(1, folders[0].id, ids(tags)));
		await testApp.wait();
		await actions.viewFolder(id(folders[0]));

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes));
		await actions.selectNotes(ids([notes[0]]));
		state = testApp.store().getState();
		expect(ids(state.selectedNoteTags)).toEqual([]);

		await actions.selectNotes(ids([notes[1]]));
		state = testApp.store().getState();
		expect(sortedIds(state.selectedNoteTags)).toEqual(sortedIds([tags[0]]));

		await actions.selectNotes(ids([notes[2]]));
		state = testApp.store().getState();
		expect(sortedIds(state.selectedNoteTags)).toEqual(sortedIds(tags));

		// TEST ACTION: Delete the notes
		await actions.selectNotes(ids(notes));
		await actions.deleteSelectedNotes();

		// check: the note tags are unaltered
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(TRASH_FILTER_ID);

		await actions.selectNotes(ids([notes[0]]));
		state = testApp.store().getState();
		expect(ids(state.selectedNoteTags)).toEqual([]);

		await actions.selectNotes(ids([notes[1]]));
		state = testApp.store().getState();
		expect(sortedIds(state.selectedNoteTags)).toEqual(sortedIds([tags[0]]));

		await actions.selectNotes(ids([notes[2]]));
		state = testApp.store().getState();
		expect(sortedIds(state.selectedNoteTags)).toEqual(sortedIds(tags));

		// TEST ACTION: Restore the notes
		await actions.selectNotes(ids(notes));
		await actions.restoreSelectedNotes();

		// check: the note tags are unaltered
		await actions.viewFolder(id(folders[0]));
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(id(folders[0]));

		await actions.selectNotes(ids([notes[0]]));
		state = testApp.store().getState();
		expect(ids(state.selectedNoteTags)).toEqual([]);

		await actions.selectNotes(ids([notes[1]]));
		state = testApp.store().getState();
		expect(sortedIds(state.selectedNoteTags)).toEqual(sortedIds([tags[0]]));

		await actions.selectNotes(ids([notes[2]]));
		state = testApp.store().getState();
		expect(sortedIds(state.selectedNoteTags)).toEqual(sortedIds(tags));
	}));

	// "list" applies for sidebar tags list, as well as tags suggestions lists
	it('should not list the trash tag', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(1);
		const tags = await createNTestTags(3);
		let notes = await createNTestNotes(1, folders[0].id);
		notes = notes.concat(await createNTestNotes(1, folders[0].id, ids([tags[0]])));
		notes = notes.concat(await createNTestNotes(1, folders[0].id, ids(tags)));
		await testApp.wait();

		await actions.viewFolder(id(folders[0]));

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes));
		expect(sortedIds(state.tags)).toEqual(sortedIds(tags));

		// check the trash tag is not listed
		expect(ids(state.tags).includes(TRASH_TAG_ID)).toEqual(false);

		// TEST ACTION: Delete the notes
		await actions.selectNotes(ids(notes));
		await actions.deleteSelectedNotes();

		// check the trash tag is not listed
		state = testApp.store().getState();
		expect(sortedIds(state.tags)).toEqual([]);
		expect(ids(state.tags).includes(TRASH_TAG_ID)).toEqual(false);
	}));

	it('should only list tags existing on non-trash notes', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(1);
		const tags = await createNTestTags(6);
		let notes = await createNTestNotes(1, folders[0].id, ids(at(tags, [0,1])));
		notes = notes.concat(await createNTestNotes(1, folders[0].id, ids([tags[2]])));
		notes = notes.concat(await createNTestNotes(1, folders[0].id, ids([tags[3]])));
		notes = notes.concat(await createNTestNotes(1, folders[0].id, ids(at(tags, [4,5]))));
		await testApp.wait();

		await actions.viewFolder(id(folders[0]));
		await actions.selectNotes(ids(at(notes, [0,1])));

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes));
		expect(sortedIds(state.tags)).toEqual(sortedIds(tags));

		// TEST ACTION: Delete some of notes with some of the tags
		await actions.deleteSelectedNotes();

		// check: only tags from notes not in the trash are listed
		state = testApp.store().getState();
		expect(sortedIds(state.tags)).toEqual(sortedIds(at(tags, [3,4,5])));

		// check: only tags from notes not in the trash are listed even when viewing trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(TRASH_FILTER_ID);
		expect(sortedIds(state.tags)).toEqual(sortedIds(at(tags, [3,4,5])));

		// TEST ACTION: Restore the notes
		await actions.selectNotes(ids(at(notes, [0,1])));
		await actions.restoreSelectedNotes();

		// check: tags are suggested when in the folder
		state = testApp.store().getState();
		expect(sortedIds(state.tags)).toEqual(sortedIds(tags));
	}));

	it('should not include trashed notes in folder note-counts', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(3);
		await Folder.moveToFolder(id(folders[2]), id(folders[1])); // subfolder
		await testApp.wait();
		const notes0 = await createNTestNotes(1, folders[0].id);
		const notes1 = await createNTestNotes(2, folders[1].id);
		const notes2 = await createNTestNotes(4, folders[2].id);
		await testApp.wait();
		await actions.viewFolder(folders[0].id);

		// check the note counts when all notes in folders
		await actions.awaitNoteCounts();
		let state = testApp.store().getState();
		let folderNoteCounts = {};
		for (const f of state.folders) { folderNoteCounts[f.id] = f.note_count; }
		let expectedNoteCounts = {};
		expectedNoteCounts[folders[0].id] = notes0.length;
		expectedNoteCounts[folders[1].id] = notes1.length + notes2.length;
		expectedNoteCounts[folders[2].id] = notes2.length;
		expect(folderNoteCounts).toEqual(expectedNoteCounts);

		// TEST ACTION: Delete some notes
		await actions.selectNotes([notes0[0].id]);
		await actions.deleteSelectedNotes();
		await actions.viewFolder(folders[1].id);
		await actions.selectNotes([notes1[1].id]);
		await actions.deleteSelectedNotes();
		await actions.viewFolder(folders[2].id);
		await actions.selectNotes(ids(at(notes2, [2,3])));
		await actions.deleteSelectedNotes();

		// check the updated note counts
		await time.msleep(1100); // wait for counts to update
		state = testApp.store().getState();
		folderNoteCounts = {};
		for (const f of state.folders) { folderNoteCounts[f.id] = f.note_count; }
		expectedNoteCounts = {};
		expectedNoteCounts[folders[0].id] = notes0.length - 1;
		expectedNoteCounts[folders[1].id] = notes1.length + notes2.length - 3;
		expectedNoteCounts[folders[2].id] = notes2.length - 2;
		expect(folderNoteCounts).toEqual(expectedNoteCounts);

		// TEST ACTION: Restore the notes
		await actions.viewFilter(TRASH_FILTER_ID);
		await actions.selectNotes([notes0[0].id]);
		await actions.restoreSelectedNotes();
		await actions.selectNotes([notes1[1].id]);
		await actions.restoreSelectedNotes();
		await actions.selectNotes(ids(at(notes2, [2,3])));
		await actions.restoreSelectedNotes();

		// check the updated note counts
		await actions.awaitNoteCounts();
		state = testApp.store().getState();
		folderNoteCounts = {};
		for (const f of state.folders) { folderNoteCounts[f.id] = f.note_count; }
		expectedNoteCounts = {};
		expectedNoteCounts[folders[0].id] = notes0.length;
		expectedNoteCounts[folders[1].id] = notes1.length + notes2.length;
		expectedNoteCounts[folders[2].id] = notes2.length;
		expect(folderNoteCounts).toEqual(expectedNoteCounts);
	}));

	it('should not include trashed notes in tag note-counts', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(1);
		const tags = await createNTestTags(3);
		const notes0 = await createNTestNotes(1, folders[0].id);
		const notes1 = await createNTestNotes(2, folders[0].id, ids([tags[0]]));
		const notes2 = await createNTestNotes(4, folders[0].id, ids(at(tags, [1,2])));
		const notes3 = await createNTestNotes(8, folders[0].id, ids(at(tags, [1])));
		await testApp.wait();
		await actions.viewFolder(folders[0].id);

		// check the tag note-counts when all notes in folders
		await actions.awaitNoteCounts();
		let state = testApp.store().getState();
		let tagNoteCounts = {};
		for (const t of state.tags) { tagNoteCounts[t.id] = t.note_count; }
		let expectedNoteCounts = {};
		expectedNoteCounts[tags[0].id] = notes1.length;
		expectedNoteCounts[tags[1].id] = notes2.length + notes3.length;
		expectedNoteCounts[tags[2].id] = notes2.length;
		expect(tagNoteCounts).toEqual(expectedNoteCounts);

		// TEST ACTION: Delete some notes
		await actions.selectNotes([notes0[0].id]);
		await actions.deleteSelectedNotes();
		await actions.selectNotes([notes1[1].id]);
		await actions.deleteSelectedNotes();
		await actions.selectNotes(ids(at(notes2, [2,3])));
		await actions.deleteSelectedNotes();
		await actions.selectNotes(ids(at(notes3, [0,1,2,3])));
		await actions.deleteSelectedNotes();

		// check the updated note counts
		await actions.awaitNoteCounts();
		state = testApp.store().getState();
		tagNoteCounts = {};
		for (const t of state.tags) { tagNoteCounts[t.id] = t.note_count; }
		expectedNoteCounts = {};
		expectedNoteCounts[tags[0].id] = notes1.length - 1;
		expectedNoteCounts[tags[1].id] = notes2.length + notes3.length - 6;
		expectedNoteCounts[tags[2].id] = notes2.length - 2;
		for (const k in expectedNoteCounts) {
			if (expectedNoteCounts[k] === 0) delete expectedNoteCounts[k];
		}
		expect(tagNoteCounts).toEqual(expectedNoteCounts);

		// TEST ACTION: Restore the notes
		await actions.viewFilter(TRASH_FILTER_ID);
		await actions.selectNotes([notes0[0].id]);
		await actions.restoreSelectedNotes();
		await actions.selectNotes([notes1[1].id]);
		await actions.restoreSelectedNotes();
		await actions.selectNotes(ids(at(notes2, [2,3])));
		await actions.restoreSelectedNotes();
		await actions.selectNotes(ids(at(notes3, [0,1,2,3])));
		await actions.restoreSelectedNotes();
		await testApp.wait();

		// check the updated note counts
		await actions.awaitNoteCounts();
		state = testApp.store().getState();
		tagNoteCounts = {};
		for (const t of state.tags) { tagNoteCounts[t.id] = t.note_count; }
		expectedNoteCounts = {};
		expectedNoteCounts[tags[0].id] = notes1.length;
		expectedNoteCounts[tags[1].id] = notes2.length + notes3.length;
		expectedNoteCounts[tags[2].id] = notes2.length;
		expect(tagNoteCounts).toEqual(expectedNoteCounts);
	}));

	it('should not show trashed notes in search results', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(1);
		const tags = await createNTestTags(1);
		const notes0 = await createNTestNotes(5, folders[0].id, null, 'Untagged ');
		const notes1 = await createNTestNotes(5, folders[0].id, [id(tags[0])], 'Tagged ');
		const notes2 = await createNTestNotes(5, folders[0].id, [TRASH_TAG_ID], 'Trash Untagged ');
		const notes3 = await createNTestNotes(5, folders[0].id, [id(tags[0]), TRASH_TAG_ID], 'Trash Tagged ');
		await testApp.wait();
		await actions.viewFolder(id(folders[0]));

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0.concat(notes1)));
		expect(sortedIds(state.tags)).toEqual(sortedIds(tags));

		// TEST ACTION: search for notes by title
		await actions.searchNotesByTitle('Untagged');

		// check all matching notes that not in the trash are listed in the result
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Search');
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0.concat(notes1)));
	}));

	// This test is not a real feature integration test as GotoAnything is an Electron
	// plugin and so is not implemented in the core. Here we fake a test by checking
	// the results from the methods that GotoAnything uses. If GotoAnything implementation
	// is changed, then this test procedure will need to be updated to match.
	it('should not include trashed notes in GotoAnything search results', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(1);
		const tags = await createNTestTags(2);
		const notes0 = await createNTestNotes(2, folders[0].id, null, 'Note Untagged ');
		const notes1 = await createNTestNotes(2, folders[0].id, [id(tags[0])], 'Note Tagged ');
		const notes2 = await createNTestNotes(2, folders[0].id, [TRASH_TAG_ID], 'Note Trash Untagged ');
		const notes3 = await createNTestNotes(2, folders[0].id, [tags[0].id, tags[1].id, TRASH_TAG_ID], 'Note Trash Tagged ');

		await actions.viewFolder(id(folders[0]));
		await actions.awaitReindexing();

		// check the state is set up as expected
		const state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0.concat(notes1)));
		expect(sortedIds(state.tags)).toEqual(sortedIds([tags[0]]));

		// TEST ACTION: fake a goto anything search by title
		let results = await SearchEngine.instance().search('title:Note');

		// check the results only include notes not in the trash
		expect(sortedIds(results)).toEqual(sortedIds(notes0.concat(notes1)));

		// TEST ACTION: fake a goto anything search by tag
		results = await Tag.searchAllWithNotes({ titlePattern: '*tag*' });

		// check the results only include tags on notes not in the trash
		expect(sortedIds(results)).toEqual([tags[0].id]);

		// TEST ACTION: fake a goto anything search by tag looking for the trash tag
		results = await Tag.searchAllWithNotes({ titlePattern: `*${TRASH_TAG_NAME}*` });

		// check the results do not include the trash tag
		expect(results.length).toEqual(0);
	}));

	it('should move a todo to trash and restore it', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(1);
		const todos0 = await createNTestTodos(3, folders[0].id);
		const todos1 = await createNTestTodos(3, folders[0].id, true);
		await actions.viewFolder(id(folders[0]));

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(id(folders[0]));
		expect(sortedIds(state.notes)).toEqual(sortedIds(todos0.concat(todos1))); // most recent incomplete

		// TEST ACTION: Delete a some todos
		await actions.selectNotes([todos0[0].id]);
		await actions.deleteSelectedNotes();
		await actions.selectNotes(ids(at(todos1, [1,2])));
		await actions.deleteSelectedNotes();

		// check: the todos should no longer exist in their parent folder
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(id(folders[0]));
		expect(sortedIds(state.notes)).toEqual(sortedIds(at(todos0, [1,2]).concat(todos1[0])));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([todos1[0]]));

		// check: the todos should exist in the trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(TRASH_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds(at(todos1, [1,2]).concat(todos0[0])));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([todos0[0]]));

		// TEST ACTION: Restore the todos from the trash
		await actions.selectNotes(ids([todos0[0], todos1[1]]));
		await actions.restoreSelectedNotes();

		// check: the todos should no longer exist in the trash
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(TRASH_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(ids([todos1[2]]));
		expect(state.selectedNoteIds).toEqual(ids([todos1[2]]));

		// check: the todos are returned to its parent folder
		await actions.viewFolder(id(folders[0]));
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(id(folders[0]));
		expect(sortedIds(state.notes)).toEqual(sortedIds(todos0.concat(at(todos1, [0,1]))));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([todos1[1]]));
	}));

	it('should always sort notes in trash', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(3, folders[0].id, [TRASH_TAG_ID]);
		await testApp.wait();
		await Note.save(notes[1]); // update note
		await actions.viewFilter(TRASH_FILTER_ID);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(TRASH_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes));
		expect(Setting.value('notes.sortOrder.field')).toEqual('user_updated_time');
		expect(Setting.value('notes.sortOrder.reverse')).toEqual(true);

		// check the notes are sorted by updated time, descending
		expect(ids(state.notes)).toEqual(ids(at(notes, [1,2,0])));

		// TEST ACTION: sort by updated time, ascending
		Setting.setValue('notes.sortOrder.reverse', false);
		await testApp.wait();

		// check the notes are sorted by updated time, earliest first));
		state = testApp.store().getState();
		expect(ids(state.notes)).toEqual(ids(at(notes, [0,2,1])));

		// TEST ACTION: sort by title, ascending
		Setting.setValue('notes.sortOrder.field', 'title');
		await testApp.wait();

		// check notes are sorted alphabetical by title
		state = testApp.store().getState();
		expect(ids(state.notes)).toEqual(ids(at(notes, [0,1,2])));

		// TEST ACTION: sort by created time, descending
		Setting.setValue('notes.sortOrder.field', 'user_created_time');
		await testApp.wait();
		Setting.setValue('notes.sortOrder.reverse', true);
		await testApp.wait();

		// check notes are sorted created time, latest first
		state = testApp.store().getState();
		expect(ids(state.notes)).toEqual(ids(at(notes, [2,1,0])));
	}));

	it('should always sort todos in trash', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(3, folders[0].id, [TRASH_TAG_ID]);
		const todos1 = await createNTestTodos(3, folders[0].id, true, [TRASH_TAG_ID]);
		const todos0 = await createNTestTodos(3, folders[0].id, false, [TRASH_TAG_ID]);
		await testApp.wait();
		await actions.viewFilter(TRASH_FILTER_ID);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(TRASH_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes.concat(todos0).concat(todos1)));

		// by user updated time, reversed, show complete todos, incomplete todos on top
		expect(Setting.value('notes.sortOrder.field')).toEqual('user_updated_time');
		expect(Setting.value('notes.sortOrder.reverse')).toEqual(true);
		expect(Setting.value('uncompletedTodosOnTop')).toEqual(true);
		expect(Setting.value('showCompletedTodos')).toEqual(true);

		// check the items are sorted according to setting
		let expectedOrder = ids(at(todos0, [2,1,0]));
		expectedOrder = expectedOrder.concat(ids(at(todos1, [2,1,0])));
		expectedOrder = expectedOrder.concat(ids(at(notes, [2,1,0])));
		expect(ids(state.notes)).toEqual(expectedOrder);

		// TEST ACTION: reverse the order
		// by user updated time, not reversed, show complete todos, incomplete todos on top
		Setting.setValue('notes.sortOrder.reverse', false);
		await testApp.wait();

		// check the items are sorted according to setting
		state = testApp.store().getState();
		expectedOrder = ids(at(todos0, [0,1,2]));
		expectedOrder = expectedOrder.concat(ids(at(notes, [0,1,2])));
		expectedOrder = expectedOrder.concat(ids(at(todos1, [0,1,2])));
		expect(ids(state.notes)).toEqual(expectedOrder);

		// TEST ACTION: don't put incomplete todos on top
		// by user updated time, not reversed, show complete todos, incomplete todos not on top
		Setting.setValue('uncompletedTodosOnTop', false);
		await testApp.wait();

		// check the items are sorted according to setting
		state = testApp.store().getState();
		expectedOrder = ids(at(notes, [0,1,2]));
		expectedOrder = expectedOrder.concat(ids(at(todos1, [0,1,2])));
		expectedOrder = expectedOrder.concat(ids(at(todos0, [0,1,2])));
		expect(ids(state.notes)).toEqual(expectedOrder);

		// TEST ACTION: don't show completed todos NB This setting should not be obeyed in trash!
		// by user updated time, reversed, don't show complete todos, incomplete todos not on top
		Setting.setValue('uncompletedTodosOnTop', false);
		await testApp.wait();
		Setting.setValue('notes.sortOrder.reverse', true); // just to make it different to previous
		await testApp.wait();

		// check the items are sorted according to setting
		state = testApp.store().getState();
		expectedOrder = ids(at(todos0, [2,1,0]));
		expectedOrder = expectedOrder.concat(ids(at(todos1, [2,1,0])));
		expectedOrder = expectedOrder.concat(ids(at(notes, [2,1,0])));
		expect(ids(state.notes)).toEqual(expectedOrder);
	}));

	it('should move unselected note to trash', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(1);
		const notes1 = await createNTestNotes(4, folders[0].id);
		const notes2 = await createNTestNotes(1, folders[0].id, [TRASH_TAG_ID]);
		await testApp.wait();

		await actions.viewFolder(folders[0].id);
		await actions.selectNotes(ids([notes1[1], notes1[2]]));

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds(at(notes1, [1,2])));
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes1));

		// TEST ACTION: Move unselected note to trash
		await actions.deleteUnselectedNote(notes1[3].id);

		// check: the previous selection is maintained
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(id(folders[0]));
		expect(sortedIds(state.notes)).toEqual(sortedIds(at(notes1, [0,1,2])));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds(at(notes1, [1,2])));

		// check the trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(TRASH_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes2.concat(notes1[3])));
		expect(state.selectedNoteIds.slice().sort()).toEqual([notes2[0].id]);
	}));

	it('should restore note from trash', asyncTest(async () => {
		// set up
		const folders = await createNTestFolders(1);
		const notes0 = await createNTestNotes(4, folders[0].id, [TRASH_TAG_ID]);
		const notes1  = await createNTestNotes(1, folders[0].id);
		await actions.viewFilter(TRASH_FILTER_ID);
		await actions.selectNotes([notes0[0].id]);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(ids(state.notes)).toEqual(ids(at(notes0, [3,2,1,0])));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes0[0]]));

		// TEST ACTION
		await actions.restoreSelectedNotes();

		// check new note is selected
		state = testApp.store().getState();
		expect(ids(state.notes)).toEqual(ids(at(notes0, [3,2,1])));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes0[3]]));
		// expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes0[1]])); // TBD desired

		// check folder
		await actions.viewFolder(folders[0].id);
		state = testApp.store().getState();
		expect(ids(state.notes)).toEqual(ids(notes1.concat(notes0[0])));
		expect(state.selectedNoteIds.slice().sort()).toEqual([notes1[0].id]);
	}));

	it('should move note to trash from folder', asyncTest(async () => {
		// set up
		const folders = await createNTestFolders(1);
		const notes0 = await createNTestNotes(4, folders[0].id);
		const notes1 = await createNTestNotes(1, folders[0].id, [TRASH_TAG_ID]);
		await testApp.wait();
		await actions.viewFolder(id(folders[0]));
		await actions.selectNotes([notes0[0].id]);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(ids(state.notes)).toEqual(ids(at(notes0, [3,2,1,0])));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes0[0]]));

		// TEST ACTION
		await actions.deleteSelectedNotes();

		// check new note is selected
		state = testApp.store().getState();
		expect(ids(state.notes)).toEqual(ids(at(notes0, [3,2,1])));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes0[1]]));

		// check trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes1.concat(notes0[0])));
		expect(state.selectedNoteIds.slice().sort()).toEqual([notes1[0].id]);
	}));

	it('should move note to trash from all-notes', asyncTest(async () => {
		// set up
		const folders = await createNTestFolders(2);
		await testApp.wait();
		const notes0 = await createNTestNotes(4, folders[0].id);
		const notes1 = await createNTestNotes(1, folders[0].id, [TRASH_TAG_ID]);
		await testApp.wait();
		await actions.viewFilter(ALL_NOTES_FILTER_ID);
		await actions.selectNotes([notes0[1].id]);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0));
		expect(state.selectedNoteIds.slice().sort()).toEqual([notes0[1].id]);

		// TEST ACTION
		await actions.deleteSelectedNotes();

		// check new note is selected
		state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(at(notes0, [3,2,0])));
		expect(state.selectedNoteIds.slice().sort()).toEqual([notes0[0].id]);

		// check trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes1.concat(notes0[1])));
		expect(state.selectedNoteIds.slice().sort()).toEqual([notes1[0].id]);
	}));

	it('should move a note to trash from conflicts (1)', asyncTest(async () => {
		// set up
		const folders = await createNTestFolders(1);
		const notes0 = await createNTestNotes(4, folders[0].id, null, 'Note', 1);
		const notes1 = await createNTestNotes(1, folders[0].id, [TRASH_TAG_ID], 'Note');
		await actions.awaitFoldersRefresh();

		await actions.viewFolder(CONFLICT_FOLDER_ID);
		await actions.selectNotes([notes0[1].id]);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes0[1]]));

		// TEST ACTION
		await actions.deleteSelectedNotes();

		// check note no longer in conflicts
		state = testApp.store().getState();
		expect(ids(state.notes)).toEqual(ids(at(notes0, [3,2,0])));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes0[0]]));

		// check note is now in trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes1.concat(notes0[1])));
		expect(state.selectedNoteIds.slice().sort()).toEqual([notes1[0].id]);
	}));

	// same as previous, except moved conflict note already belongs to trash
	it('should move a note to trash from conflicts (2)', asyncTest(async () => {
		// set up
		const folders = await createNTestFolders(1);
		const notes0 = await createNTestNotes(4, folders[0].id, [TRASH_TAG_ID], 'Note', 1);
		const notes1 = await createNTestNotes(1, folders[0].id, [TRASH_TAG_ID], 'Note');
		await actions.awaitFoldersRefresh();

		await actions.viewFolder(CONFLICT_FOLDER_ID);
		await actions.selectNotes([notes0[0].id]);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes0[0]]));

		// TEST ACTION
		await actions.deleteSelectedNotes();

		// check new note is selected
		state = testApp.store().getState();
		expect(ids(state.notes)).toEqual(ids(at(notes0, [3,2,1])));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes0[1]]));

		// check trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes1.concat(notes0[0])));
		expect(state.selectedNoteIds.slice().sort()).toEqual([notes1[0].id]);
	}));

	it('should restore notes to a new parent from trash', asyncTest(async () => {
		// set up
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });
		const note3 = await Note.save({ title: 'note3', parent_id: folder1.id });
		await Tag.addNote(TRASH_TAG_ID, note1.id);
		await Tag.addNote(TRASH_TAG_ID, note2.id);
		await Tag.addNote(TRASH_TAG_ID, note3.id);

		await actions.viewFilter(TRASH_FILTER_ID);
		await actions.selectNotes(ids([note1, note2]));

		// TEST ACTION
		await actions.moveSelectedNotesToFolder(folder2.id);

		// check trash
		let state = testApp.store().getState();
		expect(ids(state.notes)).toEqual([note3.id]);
		expect(state.selectedNoteIds).toEqual([note3.id]);

		// check folder
		await actions.viewFolder(folder2.id);
		state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds([note1, note2]));
	}));

	it('should all restore notes to a new parent from trash', asyncTest(async () => {
		// set up
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });
		const note3 = await Note.save({ title: 'note3', parent_id: folder1.id });
		await Tag.addNote(TRASH_TAG_ID, note1.id);
		await Tag.addNote(TRASH_TAG_ID, note2.id);
		await Tag.addNote(TRASH_TAG_ID, note3.id);

		await actions.viewFilter(TRASH_FILTER_ID);
		await actions.selectNotes(ids([note1, note2, note3]));

		// TEST ACTION
		await actions.moveSelectedNotesToFolder(folder2.id);

		// check trash
		let state = testApp.store().getState();
		expect(ids(state.notes)).toEqual([]);
		expect(state.selectedNoteIds).toEqual([]);

		// check folder
		await actions.viewFolder(folder2.id);
		state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds([note1, note2, note3]));
	}));

	it('should restore a conflict note with parent in trash', asyncTest(async () => {
		// set up
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id, is_conflict: 1 });
		await time.msleep(10);
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });
		await testApp.wait();
		await actions.awaitFoldersRefresh();

		await actions.viewFolder(CONFLICT_FOLDER_ID);
		await actions.selectNotes([note1.id]);
		await actions.deleteUnselectedFolder(folder1.id);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(ids(state.notes)).toEqual([note1.id]);
		expect(state.selectedNoteIds).toEqual([note1.id]);

		// TEST ACTION
		await actions.deleteSelectedNotes();
		await actions.awaitFoldersRefresh();

		// check note no longer in conflicts
		state = testApp.store().getState();
		expect(ids(state.folders)).toEqual([]);
		expect(ids(state.notes)).toEqual([]);
		expect(state.selectedNoteIds).toEqual([]);

		// check note is now in trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(ids(state.notes)).toEqual([note2.id, note1.id]);
		expect(state.selectedNoteIds).toEqual([note2.id]);

		// TEST ACTION
		await actions.selectNotes([note1.id]);
		await actions.restoreSelectedNotes();
		await actions.awaitFoldersRefresh();

		// check note no longer in trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(ids(state.folders)).toEqual([folder1.id]);
		expect(ids(state.notes)).toEqual([note2.id]);
		expect(state.selectedNoteIds).toEqual([note2.id]);

		// check note is now an orphan
		await actions.viewFolder(folder1.id);
		state = testApp.store().getState();
		expect(ids(state.folders)).toEqual([folder1.id]);
		expect(ids(state.notes)).toEqual([note1.id]);
		expect(state.selectedNoteIds).toEqual([note1.id]);
	}));

	// As previous, but parent deleted permanently
	it('should restore a parentless conflict note to orphans (2)', asyncTest(async () => {
		// set up
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id, is_conflict: 1 });
		await time.msleep(10);
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });
		await testApp.wait();
		await actions.awaitFoldersRefresh();

		await actions.viewFolder(CONFLICT_FOLDER_ID);
		await actions.selectNotes([note1.id]);
		await actions.permanentlyDeleteUnselectedFolder(folder1.id);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(ids(state.notes)).toEqual([note1.id]);
		expect(state.selectedNoteIds).toEqual([note1.id]);

		// TEST ACTION
		await actions.deleteSelectedNotes();
		await actions.awaitFoldersRefresh();

		// check note no longer in conflicts
		state = testApp.store().getState();
		expect(ids(state.folders)).toEqual([]);
		expect(ids(state.notes)).toEqual([]);
		expect(state.selectedNoteIds).toEqual([]);

		// check note is now in trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(ids(state.notes)).toEqual([note1.id]);
		expect(state.selectedNoteIds).toEqual([note1.id]);

		// TEST ACTION
		await actions.restoreSelectedNotes();
		await actions.awaitFoldersRefresh();

		// check note no longer in trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(ids(state.folders)).toEqual([ORPHANS_FOLDER_ID]);
		expect(ids(state.notes)).toEqual([]);
		expect(state.selectedNoteIds).toEqual([]);

		// check note is now an orphan
		await actions.viewFolder(ORPHANS_FOLDER_ID);
		state = testApp.store().getState();
		expect(ids(state.folders)).toEqual([ORPHANS_FOLDER_ID]);
		expect(ids(state.notes)).toEqual([note1.id]);
		expect(state.selectedNoteIds).toEqual([note1.id]);
	}));

	it('should restore unselected note from trash', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(1);
		const notes0 = await createNTestNotes(4, folders[0].id, [TRASH_TAG_ID]);
		const notes1 = await createNTestNotes(4, folders[0].id);
		await testApp.wait();

		await actions.viewFilter(TRASH_FILTER_ID);
		await actions.selectNotes(ids([notes0[2], notes0[1]]));

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds(at(notes0, [1,2])));
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0));

		// TEST ACTION: Restore unselected note to trash
		await actions.restoreUnselectedNote(notes0[3].id);

		// check: the previous selection is maintained
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(TRASH_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds(at(notes0, [0,1,2])));
		expect(state.selectedNoteIds.slice().sort()).toEqual(ids(at(notes0, [2]))); // current...
		// expect(state.selectedNoteIds.slice().sort()).toEqual(ids(at(notes0, [1,2]))); // TBD desired...

		// check the folder
		await actions.viewFolder(folders[0].id);
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(folders[0].id);
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes1.concat(notes0[3])));
		expect(state.selectedNoteIds.slice().sort()).toEqual(ids(at(notes1, [3]))); // current...
	}));

	it('should move a folder to trash', asyncTest(async () => {
		// set up
		const folders = await createNTestFolders(2);
		const notes0 = await createNTestNotes(4, folders[0].id);
		const notes1 = await createNTestNotes(4, folders[1].id);
		await testApp.wait();
		await actions.viewFolder(id(folders[0]));
		await actions.selectNotes([notes0[0].id]);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(ids(state.notes)).toEqual(ids(at(notes0, [3,2,1,0])));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes0[0]]));

		// TEST ACTION
		await actions.deleteSelectedFolder(folders[0].id);

		// check new folder and note is selected
		state = testApp.store().getState();
		expect(ids(state.folders)).toEqual(ids([folders[1]]));
		expect(ids(state.notes)).toEqual(ids(at(notes1, [3,2,1,0])));
		expect(state.selectedNoteIds.slice().sort()).toEqual(sortedIds([notes1[3]]));

		// check trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0));
		expect(state.selectedNoteIds.slice().sort()).toEqual([notes0[3].id]);
	}));

	it('should restore orphan notes to orphans folder', asyncTest(async () => {
		// set up
		const folders = await createNTestFolders(2);
		await actions.permanentlyDeleteUnselectedFolder(folders[0].id);
		const notes0 = await createNTestNotes(4, folders[0].id, [TRASH_TAG_ID], 'note0'); // orphans
		const notes1 = await createNTestNotes(4, folders[1].id, null, 'note1');
		await testApp.wait();
		await actions.viewFilter(TRASH_FILTER_ID);

		// check
		let state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folders[1]]));
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0));
		expect(state.selectedNoteIds).toEqual([notes0[3].id]);

		// TEST ACTION
		await actions.selectNotes(ids(at(notes0, [0,1])));
		await actions.restoreSelectedNotes();
		await actions.awaitFoldersRefresh();

		// check orphans folder appeared and notes no longer in trash
		state = testApp.store().getState();
		expect(ids(state.folders)).toEqual([folders[1].id, ORPHANS_FOLDER_ID]);
		expect(ids(state.notes)).toEqual(ids(at(notes0, [3,2])));
		expect(state.selectedNoteIds).toEqual([notes0[3].id]);

		// check orphans folder
		await actions.viewFolder(ORPHANS_FOLDER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(at(notes0, [1,0])));
		expect(state.selectedNoteIds).toEqual([notes0[1].id]);

		// check all notes
		await actions.viewFilter(ALL_NOTES_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes1.concat(at(notes0, [0,1]))));
	}));

	it('should move notes from orphans to folder', asyncTest(async () => {
		// set up
		const folders = await createNTestFolders(2);
		await actions.permanentlyDeleteUnselectedFolder(folders[0].id);
		const notes0 = await createNTestNotes(4, folders[0].id, [TRASH_TAG_ID], 'note0');
		const notes1 = await createNTestNotes(4, folders[1].id, null, 'note1');
		await actions.viewFilter(TRASH_FILTER_ID);
		await actions.selectNotes(ids(at(notes0, [0,2])));
		await actions.restoreSelectedNotes();
		await actions.awaitFoldersRefresh();
		await actions.viewFolder(ORPHANS_FOLDER_ID);

		// check
		let state = testApp.store().getState();
		expect(ids(state.notes)).toEqual(ids(at(notes0, [2,0])));
		expect(state.selectedNoteIds).toEqual([notes0[2].id]);

		// TEST ACTION
		await actions.selectNotes(ids(at(notes0, [0,2])));
		await actions.moveSelectedNotesToFolder(folders[1].id);
		await actions.awaitFoldersRefresh();

		// check the orphans folder has gone
		// NOTE: the orphans folder has gone, but it is still the selected folder
		// so the sidebar shows no selected folder and the notelist is empty.
		state = testApp.store().getState();
		expect(ids(state.folders)).toEqual([folders[1].id]);
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(ORPHANS_FOLDER_ID);
		expect(ids(state.notes)).toEqual([]);
		expect(state.selectedNoteIds).toEqual([]);

		// check the notes are in the new folder
		await actions.viewFolder(folders[1].id);
		state = testApp.store().getState();
		expect(ids(state.notes)).toEqual(ids(at(notes1, [3,2,1,0]).concat(at(notes0, [2,0]))));
		expect(state.selectedNoteIds).toEqual([notes1[3].id]);

		// check the notes in all-notes
		await actions.viewFilter(ALL_NOTES_FILTER_ID);
		state = testApp.store().getState();
		expect(ids(state.notes)).toEqual(ids(at(notes1, [3,2,1,0]).concat(at(notes0, [2,0]))));

		// check the notes are not back in trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(ids(state.notes)).toEqual(ids(at(notes0, [3,1])));
		expect(state.selectedNoteIds).toEqual([notes0[3].id]);
	}));

	it('should move orphan notes to trash', asyncTest(async () => {
		// set up
		const folders = await createNTestFolders(2);
		await actions.permanentlyDeleteUnselectedFolder(folders[0].id);
		const notes0 = await createNTestNotes(4, folders[0].id, [TRASH_TAG_ID], 'note0');
		const notes1 = await createNTestNotes(4, folders[1].id, null, 'note1');
		await actions.viewFilter(TRASH_FILTER_ID);
		await actions.selectNotes(ids(at(notes0, [0,2])));
		await actions.restoreSelectedNotes();
		await actions.awaitFoldersRefresh();
		await actions.viewFolder(ORPHANS_FOLDER_ID);

		// check
		let state = testApp.store().getState();
		expect(ids(state.notes)).toEqual(ids(at(notes0, [2,0])));
		expect(state.selectedNoteIds).toEqual([notes0[2].id]);

		// TEST ACTION
		await actions.selectNotes(ids(at(notes0, [0,2])));
		await actions.deleteSelectedNotes();
		await actions.awaitFoldersRefresh();

		// check the orphans folder has gone
		// NOTE: the orphans folder has gone, but it is still the selected folder
		// so the sidebar shows no selected folder and the notelist is empty.
		state = testApp.store().getState();
		expect(ids(state.folders)).toEqual([folders[1].id]);
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(ORPHANS_FOLDER_ID);
		expect(ids(state.notes)).toEqual([]);
		expect(state.selectedNoteIds).toEqual([]);

		// check the notes are not in the folder
		await actions.viewFolder(folders[1].id);
		state = testApp.store().getState();
		expect(ids(state.notes)).toEqual(ids(at(notes1, [3,2,1,0])));
		expect(state.selectedNoteIds).toEqual([notes1[3].id]);

		// check the notes in all-notes
		await actions.viewFilter(ALL_NOTES_FILTER_ID);
		state = testApp.store().getState();
		expect(ids(state.notes)).toEqual(ids(at(notes1, [3,2,1,0])));

		// check the notes are in trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(ids(state.notes)).toEqual(ids(at(notes0, [3,2,1,0])));
		expect(state.selectedNoteIds).toEqual([notes0[3].id]);
	}));

	// This test tests the interface usually used to create tags
	it('should not allow the user to create the trash tag', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(1);
		const notes0 = await createNTestNotes(3, folders[0].id);
		await actions.viewFolder(id(folders[0]));

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0));

		// TEST ACTION: try to create a tag with same name as trash tag
		const taglink = await Tag.addNoteTagByTitle(id(notes0[0]), '__trash');
		await testApp.wait();

		// check the the actual trash tag was applied... ie a new tag was not created
		state = testApp.store().getState();
		expect(taglink.tag_id).toEqual(TRASH_TAG_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds(at(notes0, [1,2])));

		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual([id(notes0[0])]);
	}));

	// This test tests the interface used to create a tag internally. This path isn't
	// expected to be directly available to the user, but we test it here just in case
	it('should not allow the app to create the trash tag directly', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(1);
		const notes0 = await createNTestNotes(3, folders[0].id);
		await testApp.wait();
		await actions.viewFolder(id(folders[0]));

		// check the state is set up as expected
		const state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0));

		// TEST ACTION: try to create a tag with same name as trash tag
		let tag = null;
		let error = null;
		try {
			tag = await Tag.save({ title: '__trash' });
		} catch (e) {
			error = e;
		}
		await testApp.wait();

		// check the attempt to create the tag failed
		expect(tag).toBe(null);
		expect(error === null).toBe(false);
		tag = await Tag.loadByTitle(TRASH_TAG_NAME);
		expect(id(tag)).toEqual(TRASH_TAG_ID);
	}));

	it('should record note delete timestamp in the note_tag link', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(3, folders[0].id);
		await testApp.wait();
		await actions.viewFolder(folders[0].id);
		await actions.selectNotes([notes[0].id]);

		// check the state is set up as expected
		const state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes));

		// TEST ACTION: Delete a single note from the folder
		const time0 = Date.now();
		await time.msleep(10);
		await actions.deleteSelectedNotes();
		await time.msleep(10);
		const time1 = Date.now();

		// check the tag link is recorded correctly
		let tagged = await NoteTag.byNoteIds(ids([notes[0]]));
		expect(tagged.length).toEqual(1);
		expect(tagged[0].tag_id).toEqual(TRASH_TAG_ID);
		expect(tagged[0].updated_time > time0).toBe(true);
		expect(tagged[0].updated_time < time1).toBe(true);

		// TEST ACTION: Restore the note from the trash
		await actions.viewFilter(TRASH_FILTER_ID);
		await actions.selectNotes([notes[0].id]);
		await actions.restoreSelectedNotes();

		// check the tag link is deleted
		tagged = await NoteTag.byNoteIds(ids([notes[0]]));
		expect(tagged.length).toEqual(0);

		// TEST ACTION: Delete the note from the folder again
		await actions.viewFolder(folders[0].id);
		await actions.selectNotes([notes[0].id]);
		const time2 = Date.now();
		await time.msleep(10);
		await actions.deleteSelectedNotes();
		await time.msleep(10);
		const time3 = Date.now();

		// check the tag link is recorded correctly
		tagged = await NoteTag.byNoteIds(ids([notes[0]]));
		expect(tagged.length).toEqual(1);
		expect(tagged[0].tag_id).toEqual(TRASH_TAG_ID);

		// check the deleted timestamp is updated
		expect(tagged[0].updated_time > time2).toBe(true);
		expect(tagged[0].updated_time < time3).toBe(true);
	}));

	it('should handle migration where user trash tag exists', asyncTest(async () => {
		// discard the provided test app
		await testApp.destroy();
		testApp = null;
		await time.msleep(1000);

		// start a the app using a legacy profile (v28) containing a user tag
		// that clashes with the intended system trash tag
		const userProfile = 'tests-build/support/profile-trash-migration';
		const userTrashTagId = '014eea9d36c14db9a8ac2797a0ab332d';

		testApp = new TestApp();
		await testApp.start(['--profile', userProfile]);
		await testApp.wait();

		// check the system trash tag exists
		let tag = await Tag.loadByTitle(TRASH_TAG_NAME);
		expect(tag.id).toEqual(TRASH_TAG_ID);

		// check the user tag has been renamed
		tag = await Tag.loadByTitle(`${TRASH_TAG_NAME}0`);
		expect(!!tag).toBe(true);
		expect(tag.id).toEqual(userTrashTagId);

		// check there are no notes in the trash
		let noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds).toEqual([]);

		// check the user notes have retained the user tag
		noteIds = await Tag.noteIds(userTrashTagId);
		expect(noteIds.length).toEqual(3);
	}));

	// This is never expected to happen, but if somehow there is some way the
	// user manages to do it, then the app should recover without drama
	it('should handle deletion of the trash tag', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(1);
		const notes1 = await createNTestNotes(2, folders[0].id);
		const notes2 = await createNTestNotes(3, folders[0].id, [TRASH_TAG_ID]);
		await testApp.wait();

		const profile = await testApp.profileDir();

		// check the setup
		let noteIds = await Folder.noteIds(folders[0].id, { includeTrash: false });
		expect(noteIds.slice().sort()).toEqual(sortedIds(notes1));

		// delete the tag and check the tag no longer exists
		await Tag.delete(TRASH_TAG_ID); // this is the normal way, it should not work
		await testApp.wait();
		let tag = await Tag.load(TRASH_TAG_ID);
		expect(!!tag).toBe(true);

		await Tag.delete(TRASH_TAG_ID, { forceDeleteTrashTag: true });
		await testApp.wait();
		tag = await Tag.load(TRASH_TAG_ID);
		expect(!tag).toBe(true);
		tag = await Tag.loadByTitle(TRASH_TAG_NAME);
		expect(!tag).toBe(true);

		// check the notes remain in trash (note_tags wasn't cleared)
		noteIds = await Folder.noteIds(folders[0].id, { includeTrash: false });
		expect(noteIds.slice().sort()).toEqual(sortedIds(notes1));

		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.slice().sort()).toEqual(sortedIds(notes2));

		// attempt to move notes in and out of trash
		let hasThrown = await checkThrowAsync(
			async () => await Note.batchDelete(ids([notes1[0]]), { permanent: false }));
		expect(hasThrown).toBe(true);
		hasThrown = await checkThrowAsync(async () => await Note.undelete(ids([notes2[0]])));
		expect(hasThrown).toBe(true);
		await testApp.wait();

		// check nothing happened
		noteIds = await Folder.noteIds(folders[0].id, { includeTrash: false });
		expect(noteIds.slice().sort()).toEqual(sortedIds(notes1));

		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.slice().sort()).toEqual(sortedIds(notes2));

		// shutdown the app
		await testApp.destroy();
		testApp = null;
		await time.msleep(1000);

		// restart the app to check for recovery
		testApp = new TestApp();
		await testApp.start(['--profile', profile]);
		await testApp.wait();

		// check the trash tag exists again
		tag = await Tag.load(TRASH_TAG_ID);
		expect(!!tag).toBe(true);
		expect(tag.title).toEqual(TRASH_TAG_NAME);

		tag = await Tag.loadByTitle(TRASH_TAG_NAME);
		expect(!!tag).toBe(true);
		expect(tag.id).toEqual(TRASH_TAG_ID);

		// check the notes remain in trash
		noteIds = await Folder.noteIds(folders[0].id, { includeTrash: false });
		expect(noteIds.slice().sort()).toEqual(sortedIds(notes1));

		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.slice().sort()).toEqual(sortedIds(notes2));

		// attempt to move notes in and out of trash
		await Note.batchDelete(ids([notes1[0]]), { permanent: false });
		await testApp.wait();
		await Note.undelete(ids([notes2[0]]));
		await testApp.wait();

		// check it worked
		noteIds = await Folder.noteIds(folders[0].id, { includeTrash: false });
		expect(noteIds.slice().sort()).toEqual(sortedIds([notes1[1], notes2[0]]));

		noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.slice().sort()).toEqual(sortedIds([notes2[1], notes2[2], notes1[0]]));
	}));

	it('should delete and restore folder', asyncTest(async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });

		await actions.viewFolder(folder1.id);
		let state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual([folder1.id]);
		expect(sortedIds(state.notes)).toEqual([note1.id]);
		expect(state.selectedNoteIds).toEqual([note1.id]);

		// TEST ACTION
		await actions.deleteSelectedFolder();

		// check
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual([]);
		expect(sortedIds(state.notes)).toEqual([]);
		expect(state.selectedNoteIds).toEqual([]);

		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual([]);
		expect(sortedIds(state.notes)).toEqual([note1.id]);
		expect(state.selectedNoteIds).toEqual([note1.id]);

		// TEST ACTION
		await actions.restoreSelectedNotes();
		await actions.awaitFoldersRefresh();

		// check note gone from trash
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual([folder1.id]);
		expect(sortedIds(state.notes)).toEqual([]);
		expect(state.selectedNoteIds).toEqual([]);

		// check folder is restored with note
		await actions.viewFolder(folder1.id);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual([folder1.id]);
		expect(sortedIds(state.notes)).toEqual([note1.id]);
		expect(state.selectedNoteIds).toEqual([note1.id]);
	}));

	it('should delete and restore folder (top, top)', asyncTest(async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		const folder3 = await Folder.save({ title: 'folder3', parent_id: folder2.id });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await time.msleep(10);
		const note2 = await Note.save({ title: 'note2', parent_id: folder2.id });
		await time.msleep(10);
		const note3 = await Note.save({ title: 'note3', parent_id: folder3.id });
		await time.msleep(10);

		await actions.viewFolder(folder1.id);
		let state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2, folder3]));
		expect(sortedIds(state.notes)).toEqual([note1.id]);
		expect(state.selectedNoteIds).toEqual([note1.id]);

		// TEST ACTION
		await actions.deleteSelectedFolder();

		// check
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual([]);
		expect(sortedIds(state.notes)).toEqual([]);
		expect(state.selectedNoteIds).toEqual([]);

		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual([]);
		expect(sortedIds(state.notes)).toEqual(sortedIds([note1, note2, note3]));
		expect(state.selectedNoteIds).toEqual([note3.id]);

		// TEST ACTION
		await actions.selectNotes([note1.id]);
		await actions.restoreSelectedNotes();
		await actions.awaitFoldersRefresh();

		// check notes in trash
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note2, note3]));
		expect(state.selectedNoteIds).toEqual([note3.id]);

		// check restored folders
		await actions.viewFolder(folder1.id);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual([note1.id]);
	}));

	it('should delete and restore folder (top, mid)', asyncTest(async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		const folder3 = await Folder.save({ title: 'folder3', parent_id: folder2.id });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await time.msleep(10);
		const note2 = await Note.save({ title: 'note2', parent_id: folder2.id });
		await time.msleep(10);
		const note3 = await Note.save({ title: 'note3', parent_id: folder3.id });
		await time.msleep(10);

		await actions.viewFolder(folder1.id);
		let state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2, folder3]));
		expect(sortedIds(state.notes)).toEqual([note1.id]);
		expect(state.selectedNoteIds).toEqual([note1.id]);

		// TEST ACTION
		await actions.deleteSelectedFolder();

		// check
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([]));
		expect(sortedIds(state.notes)).toEqual([]);
		expect(state.selectedNoteIds).toEqual([]);

		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note1, note2, note3]));
		expect(state.selectedNoteIds).toEqual([note3.id]);

		// TEST ACTION
		await actions.selectNotes([note2.id]);
		await actions.restoreSelectedNotes();
		await actions.awaitFoldersRefresh();

		// check notes in trash
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note1, note3]));
		expect(state.selectedNoteIds).toEqual([note3.id]);

		// check restored folders
		await actions.viewFolder(folder1.id);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2]));
		expect(sortedIds(state.notes)).toEqual([]);

		await actions.viewFolder(folder2.id);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2]));
		expect(sortedIds(state.notes)).toEqual([note2.id]);
	}));


	it('should delete and restore folder (top, bot)', asyncTest(async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		const folder3 = await Folder.save({ title: 'folder3', parent_id: folder2.id });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await time.msleep(10);
		const note2 = await Note.save({ title: 'note2', parent_id: folder2.id });
		await time.msleep(10);
		const note3 = await Note.save({ title: 'note3', parent_id: folder3.id });
		await time.msleep(10);

		await actions.viewFolder(folder1.id);
		let state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2, folder3]));
		expect(sortedIds(state.notes)).toEqual([note1.id]);
		expect(state.selectedNoteIds).toEqual([note1.id]);

		// TEST ACTION
		await actions.deleteSelectedFolder();

		// check
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([]));
		expect(sortedIds(state.notes)).toEqual([]);
		expect(state.selectedNoteIds).toEqual([]);

		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note1, note2, note3]));
		expect(state.selectedNoteIds).toEqual([note3.id]);

		// TEST ACTION
		await actions.selectNotes([note3.id]);
		await actions.restoreSelectedNotes();
		await actions.awaitFoldersRefresh();

		// check notes in trash
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2, folder3]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note1, note2]));
		expect(state.selectedNoteIds).toEqual([note2.id]);

		// check restored folders
		await actions.viewFolder(folder1.id);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2, folder3]));
		expect(sortedIds(state.notes)).toEqual([]);

		await actions.viewFolder(folder2.id);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2, folder3]));
		expect(sortedIds(state.notes)).toEqual([]);

		await actions.viewFolder(folder3.id);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2, folder3]));
		expect(sortedIds(state.notes)).toEqual([note3.id]);
	}));

	it('should delete and restore folder (mid, mid)', asyncTest(async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		const folder3 = await Folder.save({ title: 'folder3', parent_id: folder2.id });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await time.msleep(10);
		const note2 = await Note.save({ title: 'note2', parent_id: folder2.id });
		await time.msleep(10);
		const note3 = await Note.save({ title: 'note3', parent_id: folder3.id });
		await time.msleep(10);

		await actions.viewFolder(folder2.id);
		let state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2, folder3]));
		expect(sortedIds(state.notes)).toEqual([note2.id]);
		expect(state.selectedNoteIds).toEqual([note2.id]);

		// TEST ACTION
		await actions.deleteSelectedFolder();

		// check
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note1]));
		expect(state.selectedNoteIds).toEqual([note1.id]);

		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note2, note3]));
		expect(state.selectedNoteIds).toEqual([note3.id]);

		// TEST ACTION
		await actions.selectNotes([note2.id]);
		await actions.restoreSelectedNotes();
		await actions.awaitFoldersRefresh();

		// check notes in trash
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note3]));
		expect(state.selectedNoteIds).toEqual([note3.id]);

		// check restored folders
		await actions.viewFolder(folder1.id);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2]));
		expect(sortedIds(state.notes)).toEqual([note1.id]);

		await actions.viewFolder(folder2.id);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2]));
		expect(sortedIds(state.notes)).toEqual([note2.id]);
	}));

	it('should delete and restore folder (mid, bot)', asyncTest(async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		const folder3 = await Folder.save({ title: 'folder3', parent_id: folder2.id });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await time.msleep(10);
		const note2 = await Note.save({ title: 'note2', parent_id: folder2.id });
		await time.msleep(10);
		const note3 = await Note.save({ title: 'note3', parent_id: folder3.id });
		await time.msleep(10);

		await actions.viewFolder(folder2.id);
		let state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2, folder3]));
		expect(sortedIds(state.notes)).toEqual([note2.id]);
		expect(state.selectedNoteIds).toEqual([note2.id]);

		// TEST ACTION
		await actions.deleteSelectedFolder();

		// check
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note1]));
		expect(state.selectedNoteIds).toEqual([note1.id]);

		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note2, note3]));
		expect(state.selectedNoteIds).toEqual([note3.id]);

		// TEST ACTION
		await actions.selectNotes([note3.id]);
		await actions.restoreSelectedNotes();
		await actions.awaitFoldersRefresh();

		// check notes in trash
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2, folder3]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note2]));
		expect(state.selectedNoteIds).toEqual([note2.id]);

		// check restored folders
		await actions.viewFolder(folder1.id);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2, folder3]));
		expect(sortedIds(state.notes)).toEqual([note1.id]);

		await actions.viewFolder(folder2.id);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2, folder3]));
		expect(sortedIds(state.notes)).toEqual([]);

		await actions.viewFolder(folder3.id);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2, folder3]));
		expect(sortedIds(state.notes)).toEqual([note3.id]);
	}));

	it('should delete and restore folder (bot, bot)', asyncTest(async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		const folder3 = await Folder.save({ title: 'folder3', parent_id: folder2.id });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await time.msleep(10);
		const note2 = await Note.save({ title: 'note2', parent_id: folder2.id });
		await time.msleep(10);
		const note3 = await Note.save({ title: 'note3', parent_id: folder3.id });
		await time.msleep(10);

		await actions.viewFolder(folder3.id);
		let state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2, folder3]));
		expect(sortedIds(state.notes)).toEqual([note3.id]);
		expect(state.selectedNoteIds).toEqual([note3.id]);

		// TEST ACTION
		await actions.deleteSelectedFolder();

		// check
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note2]));
		expect(state.selectedNoteIds).toEqual([note2.id]);

		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note3]));
		expect(state.selectedNoteIds).toEqual([note3.id]);

		// TEST ACTION
		await actions.selectNotes([note3.id]);
		await actions.restoreSelectedNotes();
		await actions.awaitFoldersRefresh();

		// check notes in trash
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2, folder3]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([]));
		expect(state.selectedNoteIds).toEqual([]);

		// check restored folders
		await actions.viewFolder(folder1.id);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2, folder3]));
		expect(sortedIds(state.notes)).toEqual([note1.id]);

		await actions.viewFolder(folder2.id);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2, folder3]));
		expect(sortedIds(state.notes)).toEqual([note2.id]);

		await actions.viewFolder(folder3.id);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2, folder3]));
		expect(sortedIds(state.notes)).toEqual([note3.id]);
	}));

	it('should permanently delete a folder without notes', asyncTest(async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		await testApp.wait();
		await actions.viewFolder(folder1.id);

		let state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual([]);
		expect(state.selectedNoteIds).toEqual([]);

		// TEST ACTION: Delete the folder containing the notes
		await actions.permanentlyDeleteSelectedFolder();

		// check check folder and notes are gone
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([]));
		expect(sortedIds(state.notes)).toEqual([]);
		expect(state.selectedNoteIds).toEqual([]);

		// check nothing is in the trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([]));
		expect(state.selectedNoteIds).toEqual([]);
	}));

	it('should permanently delete a folder with notes', asyncTest(async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await testApp.wait();
		await actions.viewFolder(folder1.id);

		let state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual([note1.id]);
		expect(state.selectedNoteIds).toEqual([note1.id]);

		// TEST ACTION: Delete the folder containing the notes
		await actions.permanentlyDeleteSelectedFolder();

		// check check folder and notes are gone
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([]));
		expect(sortedIds(state.notes)).toEqual([]);
		expect(state.selectedNoteIds).toEqual([]);

		// check the notes are not in the trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([]));
		expect(state.selectedNoteIds).toEqual([]);
	}));

	it('should permanently delete a folder with notes and with notes already in trash', asyncTest(async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await time.msleep(10);
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });
		await testApp.wait();
		await actions.viewFolder(folder1.id);
		await actions.selectNotes([note2.id]);
		await actions.deleteSelectedNotes();

		let state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual([note1.id]);
		expect(state.selectedNoteIds).toEqual([note1.id]);

		// TEST ACTION: Delete the folder containing the notes
		await actions.permanentlyDeleteSelectedFolder();

		// check check folder and notes are gone
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([]));
		expect(sortedIds(state.notes)).toEqual([]);
		expect(state.selectedNoteIds).toEqual([]);

		// check the notes in trash remain
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note2]));
		expect(state.selectedNoteIds).toEqual([note2.id]);

		// TEST ACTION: Restore the notes (and so the parent)
		await actions.restoreSelectedNotes();
		await actions.awaitFoldersRefresh();

		// check the note is gone from trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([]));
		expect(state.selectedNoteIds).toEqual([]);

		// check the note is in all notes
		await actions.viewFilter(ALL_NOTES_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note2]));
		expect(state.selectedNoteIds).toEqual([note2.id]);

		// check the folder has been restored too
		await actions.viewFolder(folder1.id);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note2]));
		expect(state.selectedNoteIds).toEqual([note2.id]);
	}));

	it('should permanently delete a folder without notes but with notes already in trash', asyncTest(async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });
		await testApp.wait();
		await actions.viewFolder(folder1.id);
		await actions.selectNotes([note2.id]);
		await actions.deleteSelectedNotes();

		let state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual([]);
		expect(state.selectedNoteIds).toEqual([]);

		// TEST ACTION: Delete the folder containing the notes
		await actions.permanentlyDeleteSelectedFolder();

		// check check folder and notes are gone
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([]));
		expect(sortedIds(state.notes)).toEqual([]);
		expect(state.selectedNoteIds).toEqual([]);

		// check the notes in trash remain
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note2]));
		expect(state.selectedNoteIds).toEqual([note2.id]);

		// TEST ACTION: Restore the notes (and so the folder)
		await actions.restoreSelectedNotes();
		await actions.awaitFoldersRefresh();

		// check the note is gone from trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([]));
		expect(state.selectedNoteIds).toEqual([]);

		// check the note is in all notes
		await actions.viewFilter(ALL_NOTES_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note2]));
		expect(state.selectedNoteIds).toEqual([note2.id]);

		// check the folder has been restored too
		await actions.viewFolder(folder1.id);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note2]));
		expect(state.selectedNoteIds).toEqual([note2.id]);
	}));

	// Like above, but we delete a note from the trash before restoring the remainder
	it('should permanently delete a folder with notes and with notes already in trash (2)', asyncTest(async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await time.msleep(10);
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });
		await time.msleep(10);
		const note3 = await Note.save({ title: 'note3', parent_id: folder1.id });
		await testApp.wait();
		await actions.viewFolder(folder1.id);
		await actions.selectNotes([note2.id, note3.id]);
		await actions.deleteSelectedNotes();

		let state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual([note1.id]);
		expect(state.selectedNoteIds).toEqual([note1.id]);

		// TEST ACTION: Delete the folder containing the notes
		await actions.permanentlyDeleteSelectedFolder();

		// check check folder and notes are gone
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([]));
		expect(sortedIds(state.notes)).toEqual([]);
		expect(state.selectedNoteIds).toEqual([]);

		// check the notes in trash remain
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note2, note3]));
		expect(state.selectedNoteIds).toEqual([note3.id]);

		// TEST ACTION: delete a note from trash
		await actions.permanentlyDeleteSelectedNotes();

		// check
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note2]));
		expect(state.selectedNoteIds).toEqual([note2.id]);

		// TEST ACTION: Restore the remaining notes (and so the parent)
		await actions.restoreSelectedNotes();
		await actions.awaitFoldersRefresh();

		// check the note is gone from trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([]));
		expect(state.selectedNoteIds).toEqual([]);

		// check the note is in all notes
		await actions.viewFilter(ALL_NOTES_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note2]));
		expect(state.selectedNoteIds).toEqual([note2.id]);

		// check the folder has been restored too
		await actions.viewFolder(folder1.id);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note2]));
		expect(state.selectedNoteIds).toEqual([note2.id]);
	}));

	// Like above, but we delete a note from the trash before restoring the remainder
	it('should delete a folder with notes and with notes already in trash (2)', asyncTest(async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await time.msleep(10);
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });
		await time.msleep(10);
		const note3 = await Note.save({ title: 'note3', parent_id: folder1.id });
		await testApp.wait();
		await actions.viewFolder(folder1.id);
		await actions.selectNotes([note2.id, note3.id]);
		await actions.deleteSelectedNotes();

		let state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual([note1.id]);
		expect(state.selectedNoteIds).toEqual([note1.id]);

		// TEST ACTION: Delete the folder containing the notes
		await actions.deleteSelectedFolder();

		// check check folder and notes are gone
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([]));
		expect(sortedIds(state.notes)).toEqual([]);
		expect(state.selectedNoteIds).toEqual([]);

		// check the notes in trash remain
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note1, note2, note3]));
		expect(state.selectedNoteIds).toEqual([note3.id]);

		// TEST ACTION: delete a note from trash
		await actions.permanentlyDeleteSelectedNotes();

		// check
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note1, note2]));
		expect(state.selectedNoteIds).toEqual([note2.id]);

		// TEST ACTION: Restore the remaining notes (and so the parent)
		await actions.selectNotes([note1.id, note2.id]);
		await actions.restoreSelectedNotes();
		await actions.awaitFoldersRefresh();

		// check the note is gone from trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([]));
		expect(state.selectedNoteIds).toEqual([]);

		// check the note is in all notes
		await actions.viewFilter(ALL_NOTES_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note1, note2]));
		expect(state.selectedNoteIds).toEqual([note2.id]);

		// check the folder has been restored too
		await actions.viewFolder(folder1.id);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note1, note2]));
		expect(state.selectedNoteIds).toEqual([note2.id]);
	}));

	it('should permanently delete an unselected folder', asyncTest(async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const folder3 = await Folder.save({ title: 'folder3', parent_id: folder2.id });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await time.msleep(10);
		const note2 = await Note.save({ title: 'note2', parent_id: folder2.id });
		await time.msleep(10);
		const note3 = await Note.save({ title: 'note3', parent_id: folder3.id });
		await testApp.wait();
		await actions.viewFolder(folder1.id);

		let state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2, folder3]));
		expect(sortedIds(state.notes)).toEqual([note1.id]);
		expect(state.selectedNoteIds).toEqual([note1.id]);

		// TEST ACTION: Permanently delete an unselected folder
		await actions.permanentlyDeleteUnselectedFolder(folder2.id);

		// check check folder and notes are gone
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual([note1.id]);
		expect(state.selectedNoteIds).toEqual([note1.id]);

		// check the notes are not in the trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([]));
		expect(state.selectedNoteIds).toEqual([]);
	}));

	it('should delete an unselected folder', asyncTest(async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const folder3 = await Folder.save({ title: 'folder3', parent_id: folder2.id });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await time.msleep(10);
		const note2 = await Note.save({ title: 'note2', parent_id: folder2.id });
		await time.msleep(10);
		const note3 = await Note.save({ title: 'note3', parent_id: folder3.id });
		await testApp.wait();
		await actions.viewFolder(folder1.id);

		let state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1, folder2, folder3]));
		expect(sortedIds(state.notes)).toEqual([note1.id]);
		expect(state.selectedNoteIds).toEqual([note1.id]);

		// TEST ACTION: Permanently delete an unselected folder
		await actions.deleteUnselectedFolder(folder2.id);

		// check check folder and notes are gone
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual([note1.id]);
		expect(state.selectedNoteIds).toEqual([note1.id]);

		// check the notes are not in the trash
		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note2, note3]));
		expect(state.selectedNoteIds).toEqual([note3.id]);
	}));

	it('should restore an unselected note', asyncTest(async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await time.msleep(10);
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });
		await testApp.wait();
		await actions.viewFolder(folder1.id);
		await actions.selectNotes([note1.id, note2.id]);
		await actions.deleteSelectedNotes();

		let state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual([]);
		expect(state.selectedNoteIds).toEqual([]);

		await actions.viewFilter(TRASH_FILTER_ID);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note1, note2]));
		expect(state.selectedNoteIds).toEqual([note2.id]);

		// TEST ACTION: Restore unselected note
		await actions.restoreUnselectedNote(note1.id);

		// check the note is no longer in the trash
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note2]));
		expect(state.selectedNoteIds).toEqual([note2.id]);

		// check the note is restored in its folder
		await actions.viewFolder(folder1.id);
		state = testApp.store().getState();
		expect(sortedIds(state.folders)).toEqual(sortedIds([folder1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds([note1]));
		expect(state.selectedNoteIds).toEqual([note1.id]);
	}));
});
