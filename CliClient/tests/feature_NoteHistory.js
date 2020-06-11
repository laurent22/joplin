require('app-module-path').addPath(__dirname);
const { asyncTest, id, ids, createNTestFolders, sortedIds, createNTestNotes, TestApp } = require('test-utils.js');
const BaseModel = require('lib/BaseModel.js');
const { uuid } = require('lib/uuid.js');
const Note = require('lib/models/Note.js');
const Folder = require('lib/models/Folder.js');

const { ALL_NOTES_FILTER_ID } = require('lib/reserved-ids.js');

let testApp = null;

const goBackWard = (state) => {
	if (!state.backwardHistoryNotes.length)	return;
	testApp.dispatch({ type: 'HISTORY_BACKWARD' });
};

const goForward = (state) => {
	if (!state.forwardHistoryNotes.length) return;
	testApp.dispatch({ type: 'HISTORY_FORWARD' });
};

const goToNote = (testApp, note) => {
	testApp.dispatch({ type: 'NOTE_SELECT', id: note.id });
};

describe('feature_NoteHistory', function() {
	beforeEach(async (done) => {
		testApp = new TestApp();
		await testApp.start(['--no-welcome']);
		done();
	});

	afterEach(async (done) => {
		if (testApp !== null) await testApp.destroy();
		testApp = null;
		done();
	});

	it('should save history when navigating through notes', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(2);
		await testApp.wait();
		const notes0 = await createNTestNotes(5, folders[0]);
		// let notes1 = await createNTestNotes(5, folders[1]);
		await testApp.wait();

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[0]) });
		await testApp.wait();

		testApp.dispatch({ type: 'NOTE_SELECT', id: notes0[3].id });
		await testApp.wait();
		testApp.dispatch({ type: 'NOTE_SELECT', id: notes0[2].id });
		await testApp.wait();
		testApp.dispatch({ type: 'NOTE_SELECT', id: notes0[1].id });
		await testApp.wait();
		testApp.dispatch({ type: 'NOTE_SELECT', id: notes0[0].id });
		await testApp.wait();

		let state = testApp.store().getState();

		goBackWard(state);
		await testApp.wait();

		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[1].id]);
		expect(state.selectedFolderId).toEqual(folders[0].id);

		goBackWard(state);
		await testApp.wait();

		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[2].id]);
		expect(state.selectedFolderId).toEqual(folders[0].id);

		goForward(state);
		await testApp.wait();

		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[1].id]);
		expect(state.selectedFolderId).toEqual(folders[0].id);

		testApp.dispatch({ type: 'NOTE_SELECT', id: notes0[4].id });
		await testApp.wait();

		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[4].id]);
		expect(state.selectedFolderId).toEqual(folders[0].id);
	}));


	it('should save history when navigating through notebooks', asyncTest(async () => {
		const folders = await createNTestFolders(2);
		await testApp.wait();
		const notes0 = await createNTestNotes(5, folders[0]);
		const notes1 = await createNTestNotes(5, folders[1]);
		await testApp.wait();

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[0]) });
		await testApp.wait();

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[1]) });
		await testApp.wait();

		let state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes1[4].id]);
		expect(state.selectedFolderId).toEqual(folders[1].id);

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[0]) });
		await testApp.wait();

		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[4].id]);
		expect(state.selectedFolderId).toEqual(folders[0].id);

		goBackWard(state);
		await testApp.wait();

		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes1[4].id]);
		expect(state.selectedFolderId).toEqual(folders[1].id);

		goForward(state);
		await testApp.wait();

		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[4].id]);
		expect(state.selectedFolderId).toEqual(folders[0].id);
	}));


	it('should save history when searching for a note', asyncTest(async () => {
		const folders = await createNTestFolders(2);
		await testApp.wait();
		const notes0 = await createNTestNotes(5, folders[0]);
		const notes1 = await createNTestNotes(5, folders[1]);
		await testApp.wait();

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[0]) });
		await testApp.wait();

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[1]) });
		await testApp.wait();

		let state = testApp.store().getState();

		expect(state.selectedNoteIds).toEqual([notes1[4].id]); // notes1[4]
		expect(state.selectedFolderId).toEqual(folders[1].id);

		const searchId = uuid.create();
		testApp.dispatch({
			type: 'SEARCH_UPDATE',
			search: {
				id: searchId,
				title: notes0[0].title,
				query_pattern: notes0[0].title,
				query_folder_id: null,
				type: BaseModel.TYPE_SEARCH,
			},
		});
		await testApp.wait();

		testApp.dispatch({
			type: 'SEARCH_SELECT',
			id: searchId,
		});
		await testApp.wait();

		state = testApp.store().getState();
		expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes0[4], notes1[4]]));
		expect(ids(state.forwardHistoryNotes)).toEqual([]);
	}));

	it('should ensure no adjacent duplicates', asyncTest(async () => {
		const folders = await createNTestFolders(2);
		const notes0 = await createNTestNotes(3, folders[0]);
		await testApp.wait();

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[0]) });

		testApp.dispatch({ type: 'NOTE_SELECT', id: notes0[0].id });
		await testApp.wait();

		goToNote(testApp, notes0[1]);
		await testApp.wait();
		goToNote(testApp, notes0[2]);
		await testApp.wait();
		goToNote(testApp, notes0[1]);
		await testApp.wait();
		goToNote(testApp, notes0[2]);
		await testApp.wait();

		let state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[2].id]);
		expect(state.selectedFolderId).toEqual(folders[0].id);

		testApp.dispatch({ type: 'NOTE_DELETE', id: notes0[1].id });
		await testApp.wait();

		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[2].id]);
		expect(state.selectedFolderId).toEqual(folders[0].id);

		goBackWard(state);
		await testApp.wait();

		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[0].id]);
		expect(state.selectedFolderId).toEqual(folders[0].id);
	}));

	it('should ensure history is not corrupted when notes get deleted.', asyncTest(async () => {
		const folders = await createNTestFolders(2);
		await testApp.wait();
		const notes0 = await createNTestNotes(5, folders[0]);
		await testApp.wait();

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[0]) });
		await testApp.wait();

		testApp.dispatch({ type: 'NOTE_SELECT', id: notes0[0].id });
		await testApp.wait();

		goToNote(testApp, notes0[1]);
		await testApp.wait();

		goToNote(testApp, notes0[2]);
		await testApp.wait();

		testApp.dispatch({ type: 'NOTE_DELETE', id: notes0[1].id });
		await testApp.wait();

		let state = testApp.store().getState();
		goBackWard(state);
		await testApp.wait();

		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[0].id]);
		expect(state.selectedFolderId).toEqual(folders[0].id);
	}));

	it('should ensure history is not corrupted when notes get created.', asyncTest(async () => {
		const folders = await createNTestFolders(2);
		await testApp.wait();
		const notes0 = await createNTestNotes(5, folders[0]);
		await testApp.wait();

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[0]) });
		await testApp.wait();

		goToNote(testApp, notes0[0]);
		await testApp.wait();

		goToNote(testApp, notes0[1]);
		await testApp.wait();

		const newNote = await Note.save({
			parent_id: folders[0].id,
			is_todo: 0,
			body: 'test',
		});
		await testApp.wait();

		goToNote(testApp, newNote);
		await testApp.wait();

		let state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([newNote.id]);
		expect(state.selectedFolderId).toEqual(folders[0].id);

		goToNote(testApp, notes0[2]);
		await testApp.wait();

		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[2].id]);
		expect(state.selectedFolderId).toEqual(folders[0].id);

		goBackWard(state);
		await testApp.wait();
		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([newNote.id]);
		expect(state.selectedFolderId).toEqual(folders[0].id);

		goBackWard(state);
		await testApp.wait();
		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[1].id]);
		expect(state.selectedFolderId).toEqual(folders[0].id);

		goForward(state);
		await testApp.wait();
		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([newNote.id]);
		expect(state.selectedFolderId).toEqual(folders[0].id);

		goForward(state);
		await testApp.wait();
		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[2].id]);
		expect(state.selectedFolderId).toEqual(folders[0].id);
	}));

	it('should ensure history works when traversing all notes', asyncTest(async () => {
		const folders = await createNTestFolders(2);
		await testApp.wait();
		const notes0 = await createNTestNotes(5, folders[0]);
		const notes1 = await createNTestNotes(5, folders[1]);
		await testApp.wait();

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[0]) });
		await testApp.wait();

		goToNote(testApp, notes0[0]);
		await testApp.wait();

		testApp.dispatch({ type: 'SMART_FILTER_SELECT', id: ALL_NOTES_FILTER_ID });
		await testApp.wait();

		let state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0.concat(notes1)));
		expect(state.selectedNoteIds).toEqual(ids([notes0[0]]));

		goToNote(testApp, notes0[2]);
		await testApp.wait();

		goToNote(testApp, notes0[4]);
		await testApp.wait();

		goToNote(testApp, notes1[2]);
		await testApp.wait();

		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes1[2].id]);

		goBackWard(state);
		await testApp.wait();
		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[4].id]);

		goBackWard(state);
		await testApp.wait();
		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[2].id]);

		goBackWard(state);
		await testApp.wait();
		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[0].id]);

		goForward(state);
		await testApp.wait();
		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[2].id]);

		goForward(state);
		await testApp.wait();
		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[4].id]);
	}));

	it('should ensure history works when traversing through conflict notes', asyncTest(async () => {
		const folders = await createNTestFolders(1);
		await testApp.wait();
		const notes0 = await createNTestNotes(5, folders[0]);
		await testApp.wait();

		// create two conflict notes with parent_id folder 1
		const note1 = await Note.save({ title: 'note 1', parent_id: folders[0].id, is_conflict: 1 });
		await testApp.wait();
		const note2 = await Note.save({ title: 'note 2', parent_id: folders[0].id, is_conflict: 1 });
		await testApp.wait();

		// Testing history between conflict notes
		testApp.dispatch({ type: 'FOLDER_SELECT', id: Folder.conflictFolderId() });
		await testApp.wait();

		goToNote(testApp, note1);
		await testApp.wait();

		goToNote(testApp, note2);
		await testApp.wait();

		let state = testApp.store().getState();
		expect(state.selectedFolderId).toBe(Folder.conflictFolderId());
		expect(state.selectedNoteIds[0]).toBe(note2.id);

		goBackWard(state);
		await testApp.wait();

		state = testApp.store().getState();
		expect(state.selectedFolderId).toBe(Folder.conflictFolderId());
		expect(state.selectedNoteIds[0]).toBe(note1.id);

		goForward(state);
		await testApp.wait();

		state = testApp.store().getState();
		expect(state.selectedFolderId).toBe(Folder.conflictFolderId());
		expect(state.selectedNoteIds[0]).toBe(note2.id);

		// Testing history between conflict and non conflict notes.
		testApp.dispatch({ type: 'FOLDER_SELECT', id: folders[0].id });
		await testApp.wait();

		state = testApp.store().getState();
		expect(state.selectedFolderId).toBe(folders[0].id);
		expect(state.selectedNoteIds[0]).toBe(notes0[4].id);

		goBackWard(state);
		await testApp.wait();

		state = testApp.store().getState();
		expect(state.selectedFolderId).toBe(Folder.conflictFolderId());
		expect(state.selectedNoteIds[0]).toBe(note2.id);

		goForward(state);
		await testApp.wait();

		state = testApp.store().getState();
		expect(state.selectedFolderId).toBe(folders[0].id);
		expect(state.selectedNoteIds[0]).toBe(notes0[4].id);
	}));

});
