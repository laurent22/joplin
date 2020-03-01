/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);
const { setupDatabaseAndSynchronizer, switchClient, asyncTest, createNTestNotes, createNTestFolders, createNTestTags } = require('test-utils.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const { reducer, defaultState, stateUtils } = require('lib/reducer.js');

function initTestState(folders, selectedFolderIndex, notes, selectedNoteIndexes, tags=null, selectedTagIndex=null) {
	let state = defaultState;

	if (selectedFolderIndex != null) {
		state = reducer(state, { type: 'FOLDER_SELECT', id: folders[selectedFolderIndex].id });
	}
	if (folders != null) {
		state = reducer(state, { type: 'FOLDER_UPDATE_ALL', items: folders });
	}
	if (notes != null) {
		state = reducer(state, { type: 'NOTE_UPDATE_ALL', notes: notes, noteSource: 'test' });
	}
	if (selectedNoteIndexes != null) {
		let selectedIds = [];
		for (let i = 0; i < selectedNoteIndexes.length; i++) {
			selectedIds.push(notes[selectedNoteIndexes[i]].id);
		}
		state = reducer(state, { type: 'NOTE_SELECT', ids: selectedIds });
	}
	if (tags != null) {
		state = reducer(state, { type: 'TAG_UPDATE_ALL', items: tags });
	}
	if (selectedTagIndex != null) {
		state = reducer(state, { type: 'TAG_SELECT', id: tags[selectedTagIndex].id });
	}

	return state;
}

function createExpectedState(items, keepIndexes, selectedIndexes) {
	let expected = { items: [], selectedIds: [] };

	for (let i = 0; i < selectedIndexes.length; i++) {
		expected.selectedIds.push(items[selectedIndexes[i]].id);
	}
	for (let i = 0; i < keepIndexes.length; i++) {
		expected.items.push(items[keepIndexes[i]]);
	}
	return expected;
}

function getIds(items, indexes=null) {
	let ids = [];
	for (let i = 0; i < items.length; i++) {
		if (indexes == null || i in indexes) {
			ids.push(items[i].id);
		}
	}
	return ids;
}

let insideBeforeEach = false;

describe('Reducer', function() {

	beforeEach(async (done) => {
		insideBeforeEach = true;

		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);

		done();

		insideBeforeEach = false;
	});

	// tests for NOTE_DELETE
	it('should delete selected note', asyncTest(async () => {
		// create 1 folder
		let folders = await createNTestFolders(1);
		// create 5 notes
		let notes = await createNTestNotes(5, folders[0]);
		// select the 1st folder and the 3rd note
		let state = initTestState(folders, 0, notes, [2]);

		// test action
		// delete the third note
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[2].id });

		// expect that the third note is missing, and the 4th note is now selected
		let expected = createExpectedState(notes, [0,1,3,4], [3]);

		// check the ids of all the remaining notes
		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		// check the ids of the selected notes
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should delete selected note at top', asyncTest(async () => {
		let folders = await createNTestFolders(1);
		let notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 0, notes, [1]);

		// test action
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[0].id });

		let expected = createExpectedState(notes, [1,2,3,4], [1]);

		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should delete last remaining note', asyncTest(async () => {
		let folders = await createNTestFolders(1);
		let notes = await createNTestNotes(1, folders[0]);
		let state = initTestState(folders, 0, notes, [0]);

		// test action
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[0].id });

		let expected = createExpectedState(notes, [], []);

		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should delete selected note at bottom', asyncTest(async () => {
		let folders = await createNTestFolders(1);
		let notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 0, notes, [4]);

		// test action
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[4].id });

		let expected = createExpectedState(notes, [0,1,2,3], [3]);

		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should delete note when a note below is selected', asyncTest(async () => {
		let folders = await createNTestFolders(1);
		let notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 0, notes, [3]);

		// test action
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[1].id });

		let expected = createExpectedState(notes, [0,2,3,4], [3]);

		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should delete note when a note above is selected', asyncTest(async () => {
		let folders = await createNTestFolders(1);
		let notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 0, notes, [1]);

		// test action
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[3].id });

		let expected = createExpectedState(notes, [0,1,2,4], [1]);

		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should delete selected notes', asyncTest(async () => {
		let folders = await createNTestFolders(1);
		let notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 0, notes, [1,2]);

		// test action
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[1].id });
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[2].id });

		let expected = createExpectedState(notes, [0,3,4], [3]);

		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should delete note when a notes below it are selected', asyncTest(async () => {
		let folders = await createNTestFolders(1);
		let notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 0, notes, [3,4]);

		// test action
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[1].id });

		let expected = createExpectedState(notes, [0,2,3,4], [3,4]);

		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should delete note when a notes above it are selected', asyncTest(async () => {
		let folders = await createNTestFolders(1);
		let notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 0, notes, [1,2]);

		// test action
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[3].id });

		let expected = createExpectedState(notes, [0,1,2,4], [1,2]);

		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should delete notes at end', asyncTest(async () => {
		let folders = await createNTestFolders(1);
		let notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 0, notes, [3,4]);

		// test action
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[3].id });
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[4].id });

		let expected = createExpectedState(notes, [0,1,2], [2]);

		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should delete notes when non-contiguous selection', asyncTest(async () => {
		let folders = await createNTestFolders(1);
		let notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 0, notes, [0,2,4]);

		// test action
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[0].id });
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[2].id });
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[4].id });

		let expected = createExpectedState(notes, [1,3], [1]);

		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	// tests for FOLDER_DELETE
	it('should delete selected notebook', asyncTest(async () => {
		let folders = await createNTestFolders(5);
		let notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 2, notes, [2]);

		// test action
		state = reducer(state, { type: 'FOLDER_DELETE', id: folders[2].id });

		let expected = createExpectedState(folders, [0,1,3,4], [3]);

		expect(getIds(state.folders)).toEqual(getIds(expected.items));
		expect(state.selectedFolderId).toEqual(expected.selectedIds[0]);
	}));

	it('should delete notebook when a book above is selected', asyncTest(async () => {
		let folders = await createNTestFolders(5);
		let notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 1, notes, [2]);

		// test action
		state = reducer(state, { type: 'FOLDER_DELETE', id: folders[2].id });

		let expected = createExpectedState(folders, [0,1,3,4], [1]);

		expect(getIds(state.folders)).toEqual(getIds(expected.items));
		expect(state.selectedFolderId).toEqual(expected.selectedIds[0]);
	}));

	it('should delete notebook when a book below is selected', asyncTest(async () => {
		let folders = await createNTestFolders(5);
		let notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 4, notes, [2]);

		// test action
		state = reducer(state, { type: 'FOLDER_DELETE', id: folders[2].id });

		let expected = createExpectedState(folders, [0,1,3,4], [4]);

		expect(getIds(state.folders)).toEqual(getIds(expected.items));
		expect(state.selectedFolderId).toEqual(expected.selectedIds[0]);
	}));

	// tests for TAG_DELETE
	it('should delete selected tag', asyncTest(async () => {
		let tags = await createNTestTags(5);
		let state = initTestState(null, null, null, null, tags, [2]);

		// test action
		state = reducer(state, { type: 'TAG_DELETE', id: tags[2].id });

		let expected = createExpectedState(tags, [0,1,3,4], [3]);

		expect(getIds(state.tags)).toEqual(getIds(expected.items));
		expect(state.selectedTagId).toEqual(expected.selectedIds[0]);
	}));

	it('should delete tag when a tag above is selected', asyncTest(async () => {
		let tags = await createNTestTags(5);
		let state = initTestState(null, null, null, null, tags, [2]);

		// test action
		state = reducer(state, { type: 'TAG_DELETE', id: tags[4].id });

		let expected = createExpectedState(tags, [0,1,2,3], [2]);

		expect(getIds(state.tags)).toEqual(getIds(expected.items));
		expect(state.selectedTagId).toEqual(expected.selectedIds[0]);
	}));

	it('should delete tag when a tag below is selected', asyncTest(async () => {
		let tags = await createNTestTags(5);
		let state = initTestState(null, null, null, null, tags, [2]);

		// test action
		state = reducer(state, { type: 'TAG_DELETE', id: tags[0].id });

		let expected = createExpectedState(tags, [1,2,3,4], [2]);

		expect(getIds(state.tags)).toEqual(getIds(expected.items));
		expect(state.selectedTagId).toEqual(expected.selectedIds[0]);
	}));

	it('should select all notes', asyncTest(async () => {
		let folders = await createNTestFolders(2);
		let notes = [];
		for (let i = 0; i < folders.length; i++) {
			notes.push(...await createNTestNotes(3, folders[i]));
		}

		let state = initTestState(folders, 0, notes.slice(0,3), [0]);

		let expected = createExpectedState(notes, [0,1,2], [0]);

		expect(state.notes.length).toEqual(expected.items.length);
		expect(getIds(state.notes.slice(0,4))).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);

		// test action
		state = reducer(state, { type: 'NOTE_SELECT_ALL' });

		expected = createExpectedState(notes.slice(0,3), [0,1,2], [0,1,2]);
		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

});
