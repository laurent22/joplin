require('app-module-path').addPath(__dirname);
// const { asyncTest, id, ids, sortedIds, at, createNTestFolders, createNTestNotes, TestApp } = require('test-utils.js');
const { asyncTest, id, createNTestFolders, createNTestNotes, TestApp } = require('test-utils.js');

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
		let notes0 = await createNTestNotes(3, folders[0]);
		let notes1 = await createNTestNotes(3, folders[1]);
		await time.msleep(100);

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[1]) });
		await time.msleep(100);
		testApp.dispatch({ type: 'NOTE_SELECT', id: id(notes1[0]) });
		await time.msleep(100);


		// TO BE COMPLETED
		let state = testApp.store().getState();
		expect(state.backwardHistoryNotes).toEqual([]);
		expect(state.forwardHistoryNotes).toEqual([]);

		testApp.dispatch({ type: 'FOLDER_SELECT', id: folders[0].id, historyAction: 'goto' });
		await time.msleep(100);
		testApp.dispatch({ type: 'NOTE_SELECT', id: notes0[0].id, historyAction: 'goto' });
		await time.msleep(100);

		state = testApp.store().getState();

		expect(state.backwardHistoryNotes.length).toEqual(2);

	}));
});

// it('should save history when navigating through notebooks', asyncTest(async () => {

// }));

// it('going back and then forward should give the starting note', asyncTest(async () => {

// }));
