/* eslint-disable no-unused-vars */
require('app-module-path').addPath(__dirname);
const { setupDatabaseAndSynchronizer, switchClient, asyncTest, id, ids, sortedIds, at, createNTestFolders, createNTestNotes, createNTestTags } = require('test-utils.js');
const { TestApp, actions } = require('test-feature-utils.js');
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
// Important: TestApp.wait() must be used after TestApp.dispatch to allow the async
// processing to complete.
//

let testApp = null;

describe('feature_ShowAllNotes', function() {

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

	it('should show all notes', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(3);
		Folder.moveToFolder(id(folders[2]), id(folders[1])); // subfolder
		await testApp.wait();
		const notes0 = await createNTestNotes(3, folders[0].id);
		const notes1 = await createNTestNotes(3, folders[1].id);
		const notes2 = await createNTestNotes(3, folders[2].id);
		await testApp.wait();

		// TEST ACTION
		await actions.viewFilter(ALL_NOTES_FILTER_ID);

		// check: all the notes are shown
		const state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(ALL_NOTES_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0.concat(notes1).concat(notes2)));
	}));

	it('should show retain note selection when going from a folder to all-notes', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(2);
		const notes0 = await createNTestNotes(3, folders[0].id);
		const notes1 = await createNTestNotes(3, folders[1].id);
		await testApp.wait();

		await actions.viewFolder(folders[1].id);
		await actions.selectNotes([notes1[1].id]);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(id(folders[1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes1));
		expect(state.selectedNoteIds).toEqual(ids([notes1[1]]));

		// TEST ACTION
		await actions.viewFilter(ALL_NOTES_FILTER_ID);

		// check: all the notes are shown
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(ALL_NOTES_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0.concat(notes1)));
		expect(state.selectedNoteIds).toEqual(ids([notes1[1]]));
	}));

	it('should support note duplication', asyncTest(async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await time.msleep(10);
		const note2 = await Note.save({ title: 'note2', parent_id: folder2.id });
		await time.msleep(10);

		await actions.viewFolder(folder1.id);
		await actions.selectNotes([note1.id]);
		await actions.viewFilter(ALL_NOTES_FILTER_ID);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(sortedIds(state.notes)).toEqual(sortedIds([note1, note2]));

		// TEST ACTION: duplicate a note from the active folder
		const newNote1 = await Note.duplicate(note1.id);
		await time.msleep(100);

		// check the note is duplicated and the view updated
		state = testApp.store().getState();
		expect(state.notes.length).toEqual(3);
		expect(sortedIds(state.notes)).toEqual(sortedIds([note1, note2, newNote1]));

		// TEST ACTION: duplicate a note from a non-active folder
		const newNote2 = await Note.duplicate(note2.id);
		await time.msleep(100);

		// check the note is duplicated and the view updated
		state = testApp.store().getState();
		expect(state.notes.length).toEqual(4);
		expect(sortedIds(state.notes)).toEqual(sortedIds([note1, note2, newNote1, newNote2]));
	}));

	it('should support changing the note parent', asyncTest(async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		await time.msleep(10);
		const note2 = await Note.save({ title: 'note1', parent_id: folder2.id });
		await time.msleep(10);
		await actions.viewFolder(folder1.id);
		await actions.selectNotes([note1.id]);
		await actions.viewFilter(ALL_NOTES_FILTER_ID);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(sortedIds(state.notes)).toEqual(sortedIds([note1, note2]));
		expect(note1.parent_id).toEqual(folder1.id);

		// TEST ACTION: change the notes parent
		await actions.moveSelectedNotesToFolder(folder2.id);

		// check the view is updated and note is reparented
		state = testApp.store().getState();
		expect(state.notes.length).toEqual(2);
		expect(state.selectedNoteIds).toEqual([note1.id]);
		let note = await Note.load(note1.id);
		expect(note.parent_id).toEqual(folder2.id);

		// TEST ACTION: change the notes parent again
		await actions.moveSelectedNotesToFolder(folder1.id);

		// check the view is updated
		state = testApp.store().getState();
		expect(state.notes.length).toEqual(2);
		note = await Note.load(note1.id);
		expect(note.parent_id).toEqual(folder1.id);
	}));
});
