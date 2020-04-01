require('app-module-path').addPath(__dirname);
const { asyncTest, id, ids, createNTestFolders, createNTestNotes, TestApp } = require('test-utils.js');
const BaseModel = require('lib/BaseModel.js');
const { uuid } = require('lib/uuid.js');

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

describe('integration_ForwardBackwardNoteHistory', function() {
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
		goToNote(testApp, notes0[3]);
		await testApp.wait();
		goToNote(testApp, notes0[2]);
		await testApp.wait();
		goToNote(testApp, notes0[3]);
		await testApp.wait();
		goToNote(testApp, notes0[2]);
		await testApp.wait();
		goToNote(testApp, notes0[3]);
		await testApp.wait();
		goToNote(testApp, notes0[2]);
		await testApp.wait();
		goToNote(testApp, notes0[3]);
		await testApp.wait();
		goToNote(testApp, notes0[2]);
		await testApp.wait();
		goToNote(testApp, notes0[3]);
		await testApp.wait();

		let state = testApp.store().getState();

		goBackWard(state);
		await testApp.wait();

		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[2].id]);
		expect(state.selectedFolderId).toEqual(folders[0].id);

		goBackWard(state);

		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[3].id]);
		expect(state.selectedFolderId).toEqual(folders[0].id);

		goBackWard(state);

		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[2].id]);
		expect(state.selectedFolderId).toEqual(folders[0].id);

		goBackWard(state);

		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[3].id]);
		expect(state.selectedFolderId).toEqual(folders[0].id);

		testApp.dispatch({ type: 'NOTE_DELETE', id: notes0[2].id });
		await testApp.wait();

		state = testApp.store().getState();
		expect(state.selectedNoteIds).toEqual([notes0[3].id]);
		expect(state.selectedFolderId).toEqual(folders[0].id);
	}));
});
