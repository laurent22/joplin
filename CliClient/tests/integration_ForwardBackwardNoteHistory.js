require('app-module-path').addPath(__dirname);
const { asyncTest, id, ids, createNTestFolders, createNTestNotes, TestApp } = require('test-utils.js');

const { time } = require('lib/time-utils.js');


let testApp = null;

const goBackWard = (state) => {
	const lastItem = state.backwardHistoryNotes[state.backwardHistoryNotes.length - 1];
	testApp.dispatch({ type: 'FOLDER_AND_NOTE_SELECT', noteId: lastItem.id, folderId: lastItem.parent_id, historyAction: 'pop' });
};

const goForward = (state) => {
	const lastItem = state.forwardHistoryNotes[state.forwardHistoryNotes.length - 1];
	testApp.dispatch({ type: 'FOLDER_AND_NOTE_SELECT', noteId: lastItem.id, folderId: lastItem.parent_id, historyAction: 'push' });
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
		await time.msleep(100);
		const notes0 = await createNTestNotes(5, folders[0]);
		// let notes1 = await createNTestNotes(5, folders[1]);
		await time.msleep(100);

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[0]) });
		await time.msleep(100);

		let state = testApp.store().getState();
		expect(state.backwardHistoryNotes).toEqual([]);
		expect(state.forwardHistoryNotes).toEqual([]);

		testApp.dispatch({ type: 'NOTE_SELECT', id: notes0[3].id, historyAction: 'goto' });
		await time.msleep(100);
		testApp.dispatch({ type: 'NOTE_SELECT', id: notes0[2].id, historyAction: 'goto' });
		await time.msleep(100);
		testApp.dispatch({ type: 'NOTE_SELECT', id: notes0[1].id, historyAction: 'goto' });
		await time.msleep(100);
		testApp.dispatch({ type: 'NOTE_SELECT', id: notes0[0].id, historyAction: 'goto' });
		await time.msleep(100);

		state = testApp.store().getState();
		expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes0[4], notes0[3], notes0[2], notes0[1]]));
		expect(ids(state.forwardHistoryNotes)).toEqual([]);

		goBackWard(state);
		await time.msleep(100);

		state = testApp.store().getState();
		expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes0[4], notes0[3], notes0[2]]));
		expect(ids(state.forwardHistoryNotes)).toEqual(ids([notes0[0]]));

		goBackWard(state);
		await time.msleep(100);

		state = testApp.store().getState();
		expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes0[4], notes0[3]]));
		expect(ids(state.forwardHistoryNotes)).toEqual(ids([notes0[0], notes0[1]]));

		goForward(state);
		await time.msleep(100);

		state = testApp.store().getState();
		expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes0[4], notes0[3], notes0[2]]));
		expect(ids(state.forwardHistoryNotes)).toEqual(ids([notes0[0]]));

		testApp.dispatch({ type: 'NOTE_SELECT', id: notes0[4].id, historyAction: 'goto' });
		await time.msleep(100);

		state = testApp.store().getState();
		expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes0[4], notes0[3], notes0[2], notes0[1]]));
		expect(ids(state.forwardHistoryNotes)).toEqual([]);


	}));


	it('should save history when navigating through notebooks', asyncTest(async () => {
		const folders = await createNTestFolders(2);
		await time.msleep(100);
		const notes0 = await createNTestNotes(5, folders[0]);
		const notes1 = await createNTestNotes(5, folders[1]);
		await time.msleep(100);

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[0]) });
		await time.msleep(100);

		let state = testApp.store().getState();
		expect(state.backwardHistoryNotes).toEqual([]);
		expect(state.forwardHistoryNotes).toEqual([]);

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[1]), historyAction: 'goto' });
		await time.msleep(100);

		state = testApp.store().getState();
		expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes0[4]])); // notes0[4] was last created
		expect(ids(state.forwardHistoryNotes)).toEqual([]);

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[0]), historyAction: 'goto' });
		await time.msleep(100);

		state = testApp.store().getState();
		expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes0[4], notes1[4]]));
		expect(state.forwardHistoryNotes).toEqual([]);

		goBackWard(state);
		await time.msleep(100);

		state = testApp.store().getState();
		expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes0[4]]));
		expect(ids(state.forwardHistoryNotes)).toEqual(ids([notes0[4]]));

		goForward(state);
		await time.msleep(100);

		state = testApp.store().getState();
		expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes0[4], notes1[4]]));
		expect(state.forwardHistoryNotes).toEqual([]);


	}));

});
