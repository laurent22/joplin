require('app-module-path').addPath(__dirname);
const { asyncTest, id, ids, createNTestFolders, createNTestNotes, TestApp } = require('test-utils.js');
const BaseModel = require('lib/BaseModel.js');
const { uuid } = require('lib/uuid.js');

let testApp = null;

const goBackWard = (state) => {
	if (!state.backwardHistoryNotes.length)	return;
	const lastItem = state.backwardHistoryNotes[state.backwardHistoryNotes.length - 1];
	testApp.dispatch({ type: 'FOLDER_AND_NOTE_SELECT', noteId: lastItem.id, folderId: lastItem.parent_id, historyAction: 'goBackward' });
};

const goForward = (state) => {
	if (!state.forwardHistoryNotes.length)	return;
	const lastItem = state.forwardHistoryNotes[state.forwardHistoryNotes.length - 1];
	testApp.dispatch({ type: 'FOLDER_AND_NOTE_SELECT', noteId: lastItem.id, folderId: lastItem.parent_id, historyAction: 'goForward' });
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

		let state = testApp.store().getState();
		expect(state.backwardHistoryNotes).toEqual([]);
		expect(state.forwardHistoryNotes).toEqual([]);

		testApp.dispatch({ type: 'NOTE_SELECT', id: notes0[3].id, historyAction: 'goto' });
		await testApp.wait();
		testApp.dispatch({ type: 'NOTE_SELECT', id: notes0[2].id, historyAction: 'goto' });
		await testApp.wait();
		testApp.dispatch({ type: 'NOTE_SELECT', id: notes0[1].id, historyAction: 'goto' });
		await testApp.wait();
		testApp.dispatch({ type: 'NOTE_SELECT', id: notes0[0].id, historyAction: 'goto' });
		await testApp.wait();

		state = testApp.store().getState();
		expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes0[4], notes0[3], notes0[2], notes0[1]]));
		expect(ids(state.forwardHistoryNotes)).toEqual([]);

		goBackWard(state);
		await testApp.wait();

		state = testApp.store().getState();
		expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes0[4], notes0[3], notes0[2]]));
		expect(ids(state.forwardHistoryNotes)).toEqual(ids([notes0[0]]));

		goBackWard(state);
		await testApp.wait();

		state = testApp.store().getState();
		expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes0[4], notes0[3]]));
		expect(ids(state.forwardHistoryNotes)).toEqual(ids([notes0[0], notes0[1]]));

		goForward(state);
		await testApp.wait();

		state = testApp.store().getState();
		expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes0[4], notes0[3], notes0[2]]));
		expect(ids(state.forwardHistoryNotes)).toEqual(ids([notes0[0]]));

		testApp.dispatch({ type: 'NOTE_SELECT', id: notes0[4].id, historyAction: 'goto' });
		await testApp.wait();

		state = testApp.store().getState();
		expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes0[4], notes0[3], notes0[2], notes0[1]]));
		expect(ids(state.forwardHistoryNotes)).toEqual([]);
	}));


	it('should save history when navigating through notebooks', asyncTest(async () => {
		const folders = await createNTestFolders(2);
		await testApp.wait();
		const notes0 = await createNTestNotes(5, folders[0]);
		const notes1 = await createNTestNotes(5, folders[1]);
		await testApp.wait();

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[0]) });
		await testApp.wait();

		let state = testApp.store().getState();
		expect(state.backwardHistoryNotes).toEqual([]);
		expect(state.forwardHistoryNotes).toEqual([]);

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[1]), historyAction: 'goto' });
		await testApp.wait();

		state = testApp.store().getState();
		expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes0[4]])); // notes0[4] was last created
		expect(ids(state.forwardHistoryNotes)).toEqual([]);

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[0]), historyAction: 'goto' });
		await testApp.wait();

		state = testApp.store().getState();
		expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes0[4], notes1[4]]));
		expect(state.forwardHistoryNotes).toEqual([]);

		goBackWard(state);
		await testApp.wait();

		state = testApp.store().getState();
		expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes0[4]]));
		expect(ids(state.forwardHistoryNotes)).toEqual(ids([notes0[4]]));

		goForward(state);
		await testApp.wait();

		state = testApp.store().getState();
		expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes0[4], notes1[4]]));
		expect(state.forwardHistoryNotes).toEqual([]);
	}));


	it('should save history when searching for a note', asyncTest(async () => {
		const folders = await createNTestFolders(2);
		await testApp.wait();
		const notes0 = await createNTestNotes(5, folders[0]);
		const notes1 = await createNTestNotes(5, folders[1]);
		await testApp.wait();

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[0]) });
		await testApp.wait();

		let state = testApp.store().getState();
		expect(state.backwardHistoryNotes).toEqual([]);
		expect(state.forwardHistoryNotes).toEqual([]);

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[1]), historyAction: 'goto' });
		await testApp.wait();

		state = testApp.store().getState();
		expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes0[4]])); // notes0[4] was last created
		expect(ids(state.forwardHistoryNotes)).toEqual([]);

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
});
