require('app-module-path').addPath(__dirname);
// const { asyncTest, id, ids, sortedIds, at, createNTestFolders, createNTestNotes, TestApp } = require('test-utils.js');
const { asyncTest, id, ids, createNTestFolders, createNTestNotes, TestApp } = require('test-utils.js');

const { time } = require('lib/time-utils.js');


// The integration tests are to test the integration of the core system, comprising the
// base application with middleware, reducer and models in response to dispatched events.

// The general strategy for each integration test is:
//  - create a starting application state,
//  - inject the event to be tested
//  - check the resulting application state

// Important: sleep must be used after TestApp dispatch to allow the async processing
//  to complete

let testApp = null;

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
		let folders = await createNTestFolders(2);
		await time.msleep(100);
		// let notes0 = await createNTestNotes(3, folders[0]);
		let notes1 = await createNTestNotes(3, folders[1]);
		await time.msleep(100);

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[1]) });
		await time.msleep(100);

		testApp.dispatch({ type: 'FOLDER_UPDATE_ALL', items: folders });
		await time.msleep(100);

		testApp.dispatch({ type: 'NOTE_UPDATE_ALL', notes: notes1, noteSource: 'test' });
		await time.msleep(100);

		testApp.dispatch({ type: 'NOTE_SELECT', ids: ids([notes1[0]]) });
		await time.msleep(100);

		// reducer(state, { type: 'NOTE_SELECT', ids: selectedIds });


		let state = testApp.store().getState();
		expect(state.backwardHistoryNotes).toEqual([]);
		expect(state.forwardHistoryNotes).toEqual([]);

		// testApp.dispatch({ type: 'FOLDER_SELECT', id: folders[0].id, historyAction: 'goto' });
		// await time.msleep(100);
		// testApp.dispatch({ type: 'NOTE_SELECT', id: notes0[0].id, historyAction: 'goto' });
		// await time.msleep(100);

		// state = testApp.store().getState();
		// console.log(backwardHistoryNotes)
		// console.log(notes0)
		// console.log(notes1)
		// expect(state.backwardHistoryNotes.length).toEqual(1)
		// expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes1[0]]))
		// console.log("Folder select folder0")
		// console.log("Backward history Notes", state.backwardHistoryNotes)
		// console.log(("Selected Note Ids", state.selectedNoteIds))
		// console.log("State notes", state.notes)
		// console.log("Notes 0", notes0)
		// console.log("Notes 1", notes1)

		// testApp.dispatch({ type: 'NOTE_SELECT', id: notes0[1].id, historyAction: 'goto' });
		// await time.msleep(100);

		// expect(ids(state.backwardHistoryNotes)).toEqual(ids([notes1[0], notes0[2]]))
		// testApp.dispatch({ type: 'NOTE_SELECT', id: notes0[2].id, historyAction: 'goto' });
		// await time.msleep(100);

		// state = testApp.store().getState();
		// expect(state.backwardHistoryNotes.length).toEqual(4);
		// const lastItem = state.backwardHistoryNotes[state.backwardHistoryNotes.length - 1];

		// // go backwads
		// testApp.dispatch({ type: 'FOLDER_AND_NOTE_SELECT', noteId: lastItem.id, folderId: lastItem.parent_id, historyAction: 'pop' });
		// await time.msleep(100)

		// state = testApp.store().getState();
		// expect(state.backwardHistoryNotes.length).toEqual(3);
		// expect(ids(state.backwardHistoryNotes)).toEqual(ids());

		// expect(state.forwardHistoryNotes.length).toEqual(1);

	}));
});

// it('should save history when navigating through notebooks', asyncTest(async () => {

// }));

// it('going back and then forward should give the starting note', asyncTest(async () => {

// }));
