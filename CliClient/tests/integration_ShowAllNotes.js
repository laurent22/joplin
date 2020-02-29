/* eslint-disable no-unused-vars */
require('app-module-path').addPath(__dirname);
const { setupDatabaseAndSynchronizer, switchClient, asyncTest, id, ids, sortedIds, at, createNTestFolders, createNTestNotes, createNTestTags, TestApp } = require('test-utils.js');
const Setting = require('lib/models/Setting.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const { time } = require('lib/time-utils.js');
const { ALL_NOTES_FILTER_ID } = require('lib/reserved-ids.js');

//
// The integration tests are to test the integration of the core system, comprising the
// base application with middleware, reducer and models in response to dispatched events.
//
// The general strategy for each integration test is:
//  - create a starting application state,
//  - inject the event to be tested
//  - check the resulting application state
//
// Important: sleep must be used after TestApp dispatch to allow the async processing
//  to complete
//

// use this until Javascript arr.flat() function works in Travis
function flatten(arr) {
	return (arr.reduce((acc, val) => acc.concat(val), []));
}

let testApp = null;

describe('integration_ShowAllNotes', function() {

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

	it('should show all notes', asyncTest(async () => {
		// setup
		let folders = await createNTestFolders(3);
		Folder.moveToFolder(id(folders[2]), id(folders[1])); // subfolder
		await time.msleep(100);
		let notes0 = await createNTestNotes(3, folders[0]);
		let notes1 = await createNTestNotes(3, folders[1]);
		let notes2 = await createNTestNotes(3, folders[2]);

		// TEST ACTION: View all-notes
		testApp.dispatch({ type: 'SMART_FILTER_SELECT', id: ALL_NOTES_FILTER_ID });
		await time.msleep(100);

		// check: all the notes are shown
		let state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(ALL_NOTES_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0.concat(notes1).concat(notes2)));
	}));

	it('should show retain note selection when going from a folder to all-notes', asyncTest(async () => {
		// setup
		let folders = await createNTestFolders(2);
		let notes0 = await createNTestNotes(3, folders[0]);
		let notes1 = await createNTestNotes(3, folders[1]);
		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[1]) });
		await time.msleep(100);
		testApp.dispatch({ type: 'NOTE_SELECT',	id: id(notes1[1]) });
		await time.msleep(100);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(id(folders[1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes1));
		expect(state.selectedNoteIds).toEqual(ids([notes1[1]]));

		// TEST ACTION: View all-notes
		testApp.dispatch({ type: 'SMART_FILTER_SELECT', id: ALL_NOTES_FILTER_ID });
		await time.msleep(100);

		// check: all the notes are shown
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(ALL_NOTES_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0.concat(notes1)));
		expect(state.selectedNoteIds).toEqual(ids([notes1[1]]));
	}));
});
