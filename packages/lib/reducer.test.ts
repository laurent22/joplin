import { setupDatabaseAndSynchronizer, switchClient, createNTestNotes, createNTestFolders, createNTestTags } from './testing/test-utils';
import reducer, { defaultState, defaultWindowId, MAX_HISTORY, State } from './reducer';
import { BaseItemEntity, FolderEntity, NoteEntity, TagEntity } from './services/database/types';
import Note from './models/Note';
import BaseModel from './BaseModel';
import Folder from './models/Folder';
// const { ALL_NOTES_FILTER_ID } = require('./reserved-ids');

function initTestState(folders: FolderEntity[], selectedFolderIndex: number, notes: NoteEntity[], selectedNoteIndexes: number[], tags: TagEntity[] = null, selectedTagIndex: number = null) {
	let state = defaultState;

	if (selectedFolderIndex !== null) {
		state = reducer(state, { type: 'FOLDER_SELECT', id: folders[selectedFolderIndex].id });
	}
	if (folders !== null) {
		state = reducer(state, { type: 'FOLDER_UPDATE_ALL', items: folders });
	}
	if (notes !== null) {
		state = reducer(state, { type: 'NOTE_UPDATE_ALL', notes: notes, noteSource: 'test' });
	}
	if (selectedNoteIndexes !== null) {
		const selectedIds = [];
		for (let i = 0; i < selectedNoteIndexes.length; i++) {
			selectedIds.push(notes[selectedNoteIndexes[i]].id);
		}
		state = reducer(state, { type: 'NOTE_SELECT', ids: selectedIds });
	}
	if (tags !== null) {
		state = reducer(state, { type: 'TAG_UPDATE_ALL', items: tags });
	}
	if (selectedTagIndex !== null) {
		state = reducer(state, { type: 'TAG_SELECT', id: tags[selectedTagIndex].id });
	}

	return state;
}

function goToNote(notes: NoteEntity[], selectedNoteIndexes: number[], state: State) {
	if (selectedNoteIndexes !== null) {
		const selectedIds = [];
		for (let i = 0; i < selectedNoteIndexes.length; i++) {
			selectedIds.push(notes[selectedNoteIndexes[i]].id);
		}
		state = reducer(state, { type: 'NOTE_SELECT', ids: selectedIds });
	}
	return state;
}

function goBackWard(state: State) {
	if (!state.backwardHistoryNotes.length)	return state;
	state = reducer(state, {
		type: 'HISTORY_BACKWARD',
	});
	return state;
}

function goForward(state: State) {
	if (!state.forwardHistoryNotes.length)	return state;
	state = reducer(state, {
		type: 'HISTORY_FORWARD',
	});
	return state;
}

function createExpectedState(items: BaseItemEntity[], keepIndexes: number[], selectedIndexes: number[]) {
	const expected = { items: [] as BaseItemEntity[], selectedIds: [] as string[] };

	for (let i = 0; i < selectedIndexes.length; i++) {
		expected.selectedIds.push(items[selectedIndexes[i]].id);
	}
	for (let i = 0; i < keepIndexes.length; i++) {
		expected.items.push(items[keepIndexes[i]]);
	}
	return expected;
}

const createBackgroundWindow = (state: State, windowId: string, selectedNote: NoteEntity, notes: NoteEntity[]) => {
	state = reducer(state, {
		type: 'WINDOW_OPEN',
		windowId,
		folderId: selectedNote.parent_id,
		noteId: selectedNote.id,
	});
	const previousWindowId = state.windowId;

	state = reducer(state, {
		type: 'WINDOW_FOCUS',
		windowId,
	});
	state = reducer(state, {
		type: 'NOTE_UPDATE_ALL',
		notes: notes,
		notesSource: 'test',
	});
	state = reducer(state, {
		type: 'WINDOW_FOCUS',
		windowId: previousWindowId,
	});

	return state;
};

function getIds(items: BaseItemEntity[], indexes: number[]|null = null) {
	const ids = [];
	for (let i = 0; i < items.length; i++) {
		if (!indexes || i in indexes) {
			ids.push(items[i].id);
		}
	}
	return ids;
}

describe('reducer', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	// tests for NOTE_DELETE
	it('should delete selected note', (async () => {
		// create 1 folder
		const folders = await createNTestFolders(1);
		// create 5 notes
		const notes = await createNTestNotes(5, folders[0]);
		// select the 1st folder and the 3rd note
		let state = initTestState(folders, 0, notes, [2]);

		// test action
		// delete the third note
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[2].id });

		// expect that the third note is missing, and the 4th note is now selected
		const expected = createExpectedState(notes, [0, 1, 3, 4], [3]);

		// check the ids of all the remaining notes
		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		// check the ids of the selected notes
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should delete selected note at top', (async () => {
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 0, notes, [1]);

		// test action
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[0].id });

		const expected = createExpectedState(notes, [1, 2, 3, 4], [1]);

		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should delete last remaining note', (async () => {
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(1, folders[0]);
		let state = initTestState(folders, 0, notes, [0]);

		// test action
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[0].id });

		const expected = createExpectedState(notes, [], []);

		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should delete selected note at bottom', (async () => {
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 0, notes, [4]);

		// test action
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[4].id });

		const expected = createExpectedState(notes, [0, 1, 2, 3], [3]);

		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should delete note when a note below is selected', (async () => {
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 0, notes, [3]);

		// test action
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[1].id });

		const expected = createExpectedState(notes, [0, 2, 3, 4], [3]);

		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should delete note when a note above is selected', (async () => {
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 0, notes, [1]);

		// test action
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[3].id });

		const expected = createExpectedState(notes, [0, 1, 2, 4], [1]);

		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should delete selected notes', (async () => {
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 0, notes, [1, 2]);

		// test action
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[1].id });
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[2].id });

		const expected = createExpectedState(notes, [0, 3, 4], [3]);

		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should delete note when a notes below it are selected', (async () => {
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 0, notes, [3, 4]);

		// test action
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[1].id });

		const expected = createExpectedState(notes, [0, 2, 3, 4], [3, 4]);

		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should delete note when a notes above it are selected', (async () => {
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 0, notes, [1, 2]);

		// test action
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[3].id });

		const expected = createExpectedState(notes, [0, 1, 2, 4], [1, 2]);

		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should delete notes at end', (async () => {
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 0, notes, [3, 4]);

		// test action
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[3].id });
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[4].id });

		const expected = createExpectedState(notes, [0, 1, 2], [2]);

		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should delete notes when non-contiguous selection', (async () => {
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 0, notes, [0, 2, 4]);

		// test action
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[0].id });
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[2].id });
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[4].id });

		const expected = createExpectedState(notes, [1, 3], [1]);

		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should delete notes from background window states', (async () => {
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 0, notes, [0, 2, 4]);

		const backgroundWindowId = 'window1';
		state = createBackgroundWindow(state, backgroundWindowId, notes[2], notes);

		state = reducer(state, { type: 'NOTE_DELETE', id: notes[2].id });
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[0].id });

		let expected = createExpectedState(notes, [1, 3, 4], [1]);
		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);

		state = reducer(state, {
			type: 'WINDOW_FOCUS',
			windowId: backgroundWindowId,
		});
		expected = createExpectedState(notes, [1, 3, 4], [3]);
		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	// tests for FOLDER_DELETE
	it('should delete selected notebook', (async () => {
		const folders = await createNTestFolders(5);
		const notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 2, notes, [2]);

		// test action
		state = reducer(state, { type: 'FOLDER_DELETE', id: folders[2].id });

		const expected = createExpectedState(folders, [0, 1, 3, 4], [3]);

		expect(getIds(state.folders)).toEqual(getIds(expected.items));
		expect(state.selectedFolderId).toEqual(expected.selectedIds[0]);
	}));

	it('should delete notebook when a book above is selected', (async () => {
		const folders = await createNTestFolders(5);
		const notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 1, notes, [2]);

		// test action
		state = reducer(state, { type: 'FOLDER_DELETE', id: folders[2].id });

		const expected = createExpectedState(folders, [0, 1, 3, 4], [1]);

		expect(getIds(state.folders)).toEqual(getIds(expected.items));
		expect(state.selectedFolderId).toEqual(expected.selectedIds[0]);
	}));

	it('should delete notebook when a book below is selected', (async () => {
		const folders = await createNTestFolders(5);
		const notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 4, notes, [2]);

		// test action
		state = reducer(state, { type: 'FOLDER_DELETE', id: folders[2].id });

		const expected = createExpectedState(folders, [0, 1, 3, 4], [4]);

		expect(getIds(state.folders)).toEqual(getIds(expected.items));
		expect(state.selectedFolderId).toEqual(expected.selectedIds[0]);
	}));

	// tests for TAG_DELETE
	it('should delete selected tag', (async () => {
		const tags = await createNTestTags(5);
		let state = initTestState(null, null, null, null, tags, 2);

		// test action
		state = reducer(state, { type: 'TAG_DELETE', id: tags[2].id });

		const expected = createExpectedState(tags, [0, 1, 3, 4], [3]);

		expect(getIds(state.tags)).toEqual(getIds(expected.items));
		expect(state.selectedTagId).toEqual(expected.selectedIds[0]);
	}));

	it('should delete tag when a tag above is selected', (async () => {
		const tags = await createNTestTags(5);
		let state = initTestState(null, null, null, null, tags, 2);

		// test action
		state = reducer(state, { type: 'TAG_DELETE', id: tags[4].id });

		const expected = createExpectedState(tags, [0, 1, 2, 3], [2]);

		expect(getIds(state.tags)).toEqual(getIds(expected.items));
		expect(state.selectedTagId).toEqual(expected.selectedIds[0]);
	}));

	it('should delete tag when a tag below is selected', (async () => {
		const tags = await createNTestTags(5);
		let state = initTestState(null, null, null, null, tags, 2);

		// test action
		state = reducer(state, { type: 'TAG_DELETE', id: tags[0].id });

		const expected = createExpectedState(tags, [1, 2, 3, 4], [2]);

		expect(getIds(state.tags)).toEqual(getIds(expected.items));
		expect(state.selectedTagId).toEqual(expected.selectedIds[0]);
	}));

	it('should select all notes', (async () => {
		const folders = await createNTestFolders(2);
		const notes = [];
		for (let i = 0; i < folders.length; i++) {
			notes.push(...await createNTestNotes(3, folders[i]));
		}

		let state = initTestState(folders, 0, notes.slice(0, 3), [0]);

		let expected = createExpectedState(notes, [0, 1, 2], [0]);

		expect(state.notes.length).toEqual(expected.items.length);
		expect(getIds(state.notes.slice(0, 4))).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);

		// test action
		state = reducer(state, { type: 'NOTE_SELECT_ALL' });

		expected = createExpectedState(notes.slice(0, 3), [0, 1, 2], [0, 1, 2]);
		expect(getIds(state.notes)).toEqual(getIds(expected.items));
		expect(state.selectedNoteIds).toEqual(expected.selectedIds);
	}));

	it('should remove deleted note from history', (async () => {

		// create 1 folder
		const folders = await createNTestFolders(1);
		// create 5 notes
		const notes = await createNTestNotes(5, folders[0]);
		// select the 1st folder and the 1st note
		let state = initTestState(folders, 0, notes, [0]);

		// select second note
		state = goToNote(notes, [1], state);
		// select third note
		state = goToNote(notes, [2], state);
		// select fourth note
		state = goToNote(notes, [3], state);

		// expect history to contain first, second and third note
		expect(state.backwardHistoryNotes.length).toEqual(3);
		expect(getIds(state.backwardHistoryNotes)).toEqual(getIds(notes.slice(0, 3)));

		// delete third note
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[2].id });

		// expect history to not contain third note
		expect(getIds(state.backwardHistoryNotes)).not.toContain(notes[2].id);
	}));

	it('should remove deleted note from history in background window', async () => {
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(5, folders[0]);
		let state = initTestState(folders, 0, notes, [0]);

		const windowId1 = 'window1';
		state = createBackgroundWindow(state, windowId1, notes[0], notes);

		state = goToNote(notes, [1], state);
		state = goToNote(notes, [2], state);
		state = goToNote(notes, [3], state);
		state = goToNote(notes, [4], state);

		expect(getIds(state.backwardHistoryNotes)).toEqual([notes[0].id, notes[1].id, notes[2].id, notes[3].id]);

		// Remove a note in another window
		state = reducer(state, { type: 'WINDOW_FOCUS', windowId: windowId1 });
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[2].id });
		state = reducer(state, { type: 'WINDOW_FOCUS', windowId: defaultWindowId });

		// should have removed the note from history in the unfocused window
		expect(getIds(state.backwardHistoryNotes)).toEqual([notes[0].id, notes[1].id, notes[3].id]);
	});

	it('should remove all notes of a deleted notebook from history', (async () => {
		const folders = await createNTestFolders(2);
		const notes = [];
		for (let i = 0; i < folders.length; i++) {
			notes.push(...await createNTestNotes(3, folders[i]));
		}

		let state = initTestState(folders, 0, notes.slice(0, 3), [0]);
		state = goToNote(notes, [1], state);
		state = goToNote(notes, [2], state);


		// go to second folder
		state = reducer(state, { type: 'FOLDER_SELECT', id: folders[1].id });
		expect(getIds(state.backwardHistoryNotes)).toEqual(getIds(notes.slice(0, 3)));

		// delete the first folder
		state = reducer(state, { type: 'FOLDER_DELETE', id: folders[0].id });

		expect(getIds(state.backwardHistoryNotes)).toEqual([]);
	}));

	it('should maintain history correctly when going backward and forward', (async () => {
		const folders = await createNTestFolders(2);
		const notes = [];
		for (let i = 0; i < folders.length; i++) {
			notes.push(...await createNTestNotes(5, folders[i]));
		}

		let state = initTestState(folders, 0, notes.slice(0, 5), [0]);
		state = goToNote(notes, [1], state);
		state = goToNote(notes, [2], state);
		state = goToNote(notes, [3], state);
		state = goToNote(notes, [4], state);

		expect(getIds(state.backwardHistoryNotes)).toEqual(getIds(notes.slice(0, 4)));

		state = goBackWard(state);
		expect(getIds(state.backwardHistoryNotes)).toEqual(getIds(notes.slice(0, 3)));
		expect(getIds(state.forwardHistoryNotes)).toEqual(getIds(notes.slice(4, 5)));

		state = goBackWard(state);
		expect(getIds(state.backwardHistoryNotes)).toEqual(getIds(notes.slice(0, 2)));
		// because we push the last seen note to stack.
		expect(getIds(state.forwardHistoryNotes)).toEqual(getIds([notes[4], notes[3]]));

		state = goForward(state);
		expect(getIds(state.backwardHistoryNotes)).toEqual(getIds(notes.slice(0, 3)));
		expect(getIds(state.forwardHistoryNotes)).toEqual(getIds([notes[4]]));

		state = goForward(state);
		expect(getIds(state.backwardHistoryNotes)).toEqual(getIds(notes.slice(0, 4)));
		expect(getIds(state.forwardHistoryNotes)).toEqual([]);
	}));

	it('should remember the last seen note of a notebook', (async () => {
		const folders = await createNTestFolders(2);
		const notes = [];
		for (let i = 0; i < folders.length; i++) {
			notes.push(...await createNTestNotes(5, folders[i]));
		}

		let state = initTestState(folders, 0, notes.slice(0, 5), [0]);

		state = goToNote(notes, [1], state);
		state = goToNote(notes, [2], state);
		state = goToNote(notes, [3], state);
		state = goToNote(notes, [4], state); // last seen note is notes[4]
		// go to second folder
		state = reducer(state, { type: 'FOLDER_SELECT', id: folders[1].id });
		state = goToNote(notes, [5], state);
		state = goToNote(notes, [6], state);

		// return to first folder
		state = reducer(state, { type: 'FOLDER_SELECT', id: folders[0].id });

		expect(state.lastSelectedNotesIds.Folder[folders[0].id]).toEqual([notes[4].id]);

		// return to second folder
		state = reducer(state, { type: 'FOLDER_SELECT', id: folders[1].id });
		expect(state.lastSelectedNotesIds.Folder[folders[1].id]).toEqual([notes[6].id]);

	}));

	it('should ensure that history is free of adjacent duplicates', (async () => {
		// create 1 folder
		const folders = await createNTestFolders(1);
		// create 5 notes
		const notes = await createNTestNotes(5, folders[0]);
		// select the 1st folder and the 1st note
		let state = initTestState(folders, 0, notes, [0]);

		// backward = 0 1 2 3 2 3 2 3 2 3 2
		// forward =
		// current = 3
		state = goToNote(notes, [1], state);
		state = goToNote(notes, [2], state);
		state = goToNote(notes, [3], state);
		state = goToNote(notes, [2], state);
		state = goToNote(notes, [3], state);
		state = goToNote(notes, [2], state);
		state = goToNote(notes, [3], state);
		state = goToNote(notes, [2], state);
		state = goToNote(notes, [3], state);
		state = goToNote(notes, [2], state);
		state = goToNote(notes, [3], state);

		// backward = 0 1 2 3 2 3 2 3 2 3
		// forward = 3
		// current = 2
		state = goBackWard(state);

		// backward = 0 1 2 3 2 3 2 3 2
		// forward = 3 2
		// current = 3
		state = goBackWard(state);

		// backward = 0 1 2 3 2 3 2 3
		// forward = 3 2 3
		// current = 2
		state = goBackWard(state);

		// backward = 0 1 2 3 2 3 2
		// forward = 3 2 3 2
		// current = 3
		state = goBackWard(state);

		expect(state.backwardHistoryNotes.map(n=>n.id)).toEqual([notes[0], notes[1], notes[2], notes[3], notes[2], notes[3], notes[2]].map(n=>n.id));
		expect(state.forwardHistoryNotes.map(n=>n.id)).toEqual([notes[3], notes[2], notes[3], notes[2]].map(n=>n.id));
		expect(state.selectedNoteIds).toEqual([notes[3].id]);

		// delete third note
		state = reducer(state, { type: 'NOTE_DELETE', id: notes[2].id });

		// if adjacent duplicates not removed
		// backward = 0 1 3 3
		// forward = 3 3
		// current = 3

		// if adjacent duplicates are removed
		// backward = 0 1 3
		// forward = 3
		// current = 3

		// Expected: adjacent duplicates are removed and latest history does not contain current note
		// backward = 0 1
		// forward =
		// current = 3
		expect(state.backwardHistoryNotes.map(x => x.id)).toEqual([notes[0].id, notes[1].id]);
		expect(state.forwardHistoryNotes.map(x => x.id)).toEqual([]);
		expect(state.selectedNoteIds).toEqual([notes[3].id]);
	}));

	it('should ensure history max limit is maintained', (async () => {
		const folders = await createNTestFolders(1);
		// create 5 notes
		const notes = await createNTestNotes(5, folders[0]);
		// select the 1st folder and the 1st note
		let state = initTestState(folders, 0, notes, [0]);

		for (let i = 0; i < 2 * MAX_HISTORY; i++) {
			state = goToNote(notes, [i % 5], state);
		}

		expect(state.backwardHistoryNotes.length).toEqual(MAX_HISTORY);
		expect(state.forwardHistoryNotes.map(x => x.id)).toEqual([]);

		for (let i = 0; i < 2 * MAX_HISTORY; i++) {
			state = goBackWard(state);
		}

		expect(state.backwardHistoryNotes).toEqual([]);
		expect(state.forwardHistoryNotes.length).toEqual(MAX_HISTORY);

		for (let i = 0; i < 2 * MAX_HISTORY; i++) {
			state = goForward(state);
		}

		expect(state.backwardHistoryNotes.length).toEqual(MAX_HISTORY);
		expect(state.forwardHistoryNotes.map(x => x.id)).toEqual([]);
	}));

	// it('should not change folders when all notes filter is on', async () => {
	// 	const folders = await createNTestFolders(2);
	// 	const notes = [];
	// 	for (let i = 0; i < folders.length; i++) {
	// 		notes.push(...await createNTestNotes(1, folders[i]));
	// 	}
	// 	// initialize state with no folders selected
	// 	let state = initTestState(folders, null, notes.slice(0,2), null);

	// 	// turn on 'All Notes' filter
	// 	state = reducer(state, { type: 'SMART_FILTER_SELECT', id: ALL_NOTES_FILTER_ID });

	// 	// change folder
	// 	state = reducer(state, { type: 'FOLDER_AND_NOTE_SELECT', folderId: folders[1].id, noteId: notes[1].id });

	// 	expect(state.selectedFolderId).toEqual(null);
	// 	expect(state.selectedNoteIds[0]).toEqual(notes[1].id);
	// });

	// tests for NOTE_UPDATE_ALL about issue #5447
	it('should not change selectedNoteIds object when selections are not changed', async () => {
		const folders = await createNTestFolders(1);
		const notes = await createNTestNotes(5, folders[0]);
		{
			// Case 1. Selected notes are changed when one of selected notes is deleted.
			let state = initTestState(folders, 0, notes, [0, 2, 4]);
			state = reducer(state, { type: 'NOTE_UPDATE_ALL', notes: notes.slice(0, 4), notesSource: 'test' });
			const expected = [notes[0].id, notes[2].id].sort();
			expect([...state.selectedNoteIds].sort()).toEqual(expected);
		}
		{
			// Case 2. Selected notes and object identity are unchanged when notes are not changed.
			let state = initTestState(folders, 0, notes, [0, 2, 4]);
			const expected = state.selectedNoteIds;
			state = reducer(state, { type: 'NOTE_UPDATE_ALL', notes: notes, notesSource: 'test' });
			// Object identity is checked. Don't use toEqual() or toStrictEqual() here.
			expect(state.selectedNoteIds).toBe(expected);
		}
	});

	// tests for TAG_UPDATE_ALL about PR #6451
	it('should not change tags when a new value is deep equal to the old value', async () => {
		const tags = await createNTestTags(6);
		const oldTags = tags.slice(0, 5);
		{
			// Case 1. The input which is deep equal to the current state.tags doesn't change state.tags.
			const oldState = initTestState(null, null, null, null, oldTags, 2);
			const newTags = oldTags.slice();
			// test action
			const newState = reducer(oldState, { type: 'TAG_UPDATE_ALL', items: newTags });
			expect(newState.tags).toBe(oldState.tags);
		}
		{
			// Case 2. A different input changes state.tags.
			const oldState = initTestState(null, null, null, null, oldTags, 2);
			const newTags = oldTags.slice().splice(3, 1, tags[5]);
			// test action
			const newState = reducer(oldState, { type: 'TAG_UPDATE_ALL', items: newTags });
			expect(newState.tags).not.toBe(oldState.tags);
		}
	});

	// Regression test for #10589.
	it.each([
		[true, false],
		[undefined, false],
		[undefined, true],
		[false, true],
	])('should preserve note selection if specified with an option (preserveSelection: %j, allowSelectionInOtherFolders: %j)', async (
		preserveSelectionOption, allowSelectionInOtherFolders,
	) => {
		const folders = await createNTestFolders(3);
		const notes = await createNTestNotes(5, folders[0]);

		// select the 1st folder and the 1st note
		let state = initTestState(folders, 0, notes, [0]);
		state = { ...state, allowSelectionInOtherFolders };
		state = goToNote(notes, [0], state);

		expect(state.selectedNoteIds).toHaveLength(1);

		BaseModel.dispatch = jest.fn((action: unknown) => {
			state = reducer(state, action);
		});

		// Dispatching with preserveSelection should preserve the selected note (as is done on
		// mobile).
		await Note.moveToFolder(
			state.selectedNoteIds[0],
			folders[1].id,
			{ dispatchOptions: { preserveSelection: preserveSelectionOption } },
		);

		expect(BaseModel.dispatch).toHaveBeenCalled();

		// preserveSelectionOption takes precedence over allowSelectionInOtherFolders
		const shouldPreserveSelection = preserveSelectionOption ?? allowSelectionInOtherFolders;

		if (shouldPreserveSelection) {
			expect(state.selectedNoteIds).toMatchObject([notes[0].id]);
		} else {
			expect(state.selectedNoteIds).toMatchObject([notes[1].id]);
		}
		// Original note should no longer be present in the sidebar
		expect(state.notes.every(n => n.id !== notes[0].id)).toBe(true);
		expect(state.selectedFolderId).toBe(folders[0].id);
	});

	test('when selection is allowed in unselected folders, NOTE_UPDATE_ALL should not remove items from the selection', async () => {
		const folders = await createNTestFolders(2);
		const notes = await createNTestNotes(2, folders[0]);

		// select the 1st folder and the 1st note
		let state = initTestState(folders, 0, notes, [0]);
		state = { ...state, allowSelectionInOtherFolders: true };
		state = goToNote(notes, [0], state);

		expect(state.selectedNoteIds).toEqual([notes[0].id]);
		expect(state.notes).toHaveLength(2);

		state = reducer(state, {
			type: 'NOTE_UPDATE_ALL',
			notes: [],
		});

		expect(state.notes).toHaveLength(0);
		expect(state.selectedNoteIds).toEqual([notes[0].id]);
	});

	// window tests
	test('switching windows should move state from background to the foreground', async () => {
		const folders = await createNTestFolders(2);
		const notes1 = await createNTestNotes(3, folders[0]);
		const noteIds1 = getIds(notes1);
		const notes2 = await createNTestNotes(4, folders[1]);
		const noteIds2 = getIds(notes2);
		let state = initTestState(folders, 0, notes1, [0]);

		const window1Id = 'window1';
		const window2Id = 'window2';
		state = createBackgroundWindow(state, window1Id, notes1[2], notes1);
		state = createBackgroundWindow(state, window2Id, notes2[1], notes2);

		const checkCurrentState = (windowId: string) => {
			expect(state.windowId).toBe(windowId);
			expect(getIds(state.notes)).toEqual(windowId === window2Id ? noteIds2 : noteIds1);
			expect(state.selectedFolderId).toBe(windowId === window2Id ? folders[1].id : folders[0].id);

			let expectedSelectedNoteIds = [notes1[0].id];
			if (windowId === window2Id) {
				expectedSelectedNoteIds = [notes2[1].id];
			} else if (windowId === window1Id) {
				expectedSelectedNoteIds = [notes1[2].id];
			}
			expect(state.selectedNoteIds).toEqual(expectedSelectedNoteIds);
		};

		const navigationPattern = [
			window1Id, window2Id, defaultWindowId, defaultWindowId, window2Id, window1Id, defaultWindowId,
		];

		for (const windowId of navigationPattern) {
			state = reducer(state, {
				type: 'WINDOW_FOCUS',
				windowId,
			});
			checkCurrentState(windowId);
		}
	});

	test('closing the focused window should set the focus to a different window', async () => {
		const folder = await Folder.save({ title: 'Test' });
		const notes = await createNTestNotes(3, folder);
		let state = initTestState([folder], 0, notes, [0]);

		const secondaryWindowId = 'window1';
		state = createBackgroundWindow(state, secondaryWindowId, notes[2], notes);

		state = reducer(state, {
			type: 'WINDOW_FOCUS',
			windowId: secondaryWindowId,
		});

		expect(state.windowId).toBe(secondaryWindowId);
		expect(state.selectedNoteIds).toEqual([notes[2].id]);


		// Closing the focused window should set focus to the other window
		state = reducer(state, {
			type: 'WINDOW_CLOSE',
			windowId: secondaryWindowId,
		});

		// There should be no background windows
		expect(state.backgroundWindows).toEqual({});

		// The other window should be focused
		expect(state.windowId).toBe(defaultWindowId);
		expect(state.selectedNoteIds).toEqual([notes[0].id]);
	});
});
