/* eslint-disable no-unused-vars */
const { setupDatabaseAndSynchronizer, switchClient, id, ids, sortedIds, at, createNTestFolders, createNTestNotes, createNTestTags, TestApp } = require('@joplin/lib/testing/test-utils.js');
const Setting = require('@joplin/lib/models/Setting').default;
const Folder = require('@joplin/lib/models/Folder').default;
const Note = require('@joplin/lib/models/Note').default;
const Tag = require('@joplin/lib/models/Tag').default;
const time = require('@joplin/lib/time').default;
const { ALL_NOTES_FILTER_ID } = require('@joplin/lib/reserved-ids.js');

//
// The integration tests are to test the integration of the core system, comprising the
// base application with middleware, reducer and models in response to dispatched events.
//
// The general strategy for each integration test is:
//  - create a starting application state,
//  - inject the event to be tested
//  - check the resulting application state
//
// Important: TestApp.wait() must be used after TestApp dispatch to allow the async
// processing to complete
//

let testApp = null;

describe('integration_ShowAllNotes', function() {

	beforeEach(async () => {
		testApp = new TestApp();
		await testApp.start(['--no-welcome']);
	});

	afterEach(async () => {
		if (testApp !== null) await testApp.destroy();
		testApp = null;
	});

	it('should show all notes', (async () => {
		// setup
		const folders = await createNTestFolders(3);
		Folder.moveToFolder(id(folders[2]), id(folders[1])); // subfolder
		await testApp.wait();
		const notes0 = await createNTestNotes(3, folders[0]);
		const notes1 = await createNTestNotes(3, folders[1]);
		const notes2 = await createNTestNotes(3, folders[2]);
		await testApp.wait();

		// TEST ACTION: View all-notes
		testApp.dispatch({ type: 'SMART_FILTER_SELECT', id: ALL_NOTES_FILTER_ID });
		await testApp.wait();

		// check: all the notes are shown
		const state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(ALL_NOTES_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0.concat(notes1).concat(notes2)));
	}));

	it('should show retain note selection when going from a folder to all-notes', (async () => {
		// setup
		const folders = await createNTestFolders(2);
		const notes0 = await createNTestNotes(3, folders[0]);
		const notes1 = await createNTestNotes(3, folders[1]);
		await testApp.wait();

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[1]) });
		await testApp.wait();
		testApp.dispatch({ type: 'NOTE_SELECT',	id: id(notes1[1]) });
		await testApp.wait();

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(id(folders[1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes1));
		expect(state.selectedNoteIds).toEqual(ids([notes1[1]]));

		// TEST ACTION: View all-notes
		testApp.dispatch({ type: 'SMART_FILTER_SELECT', id: ALL_NOTES_FILTER_ID });
		await testApp.wait();

		// check: all the notes are shown
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(ALL_NOTES_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0.concat(notes1)));
		expect(state.selectedNoteIds).toEqual(ids([notes1[1]]));
	}));

	it('should support note duplication', (async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder2.id });
		testApp.dispatch({ type: 'FOLDER_SELECT', id: folder1.id }); // active folder
		await time.msleep(100);
		testApp.dispatch({ type: 'NOTE_SELECT',	id: note1.id });
		await time.msleep(100);
		testApp.dispatch({ type: 'SMART_FILTER_SELECT', id: ALL_NOTES_FILTER_ID });
		await time.msleep(100);

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

	it('should support changing the note parent', (async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note1', parent_id: folder2.id });
		testApp.dispatch({ type: 'FOLDER_SELECT', id: folder1.id }); // active folder
		await time.msleep(100);
		testApp.dispatch({ type: 'NOTE_SELECT',	id: note1.id });
		await time.msleep(100);
		testApp.dispatch({ type: 'SMART_FILTER_SELECT', id: ALL_NOTES_FILTER_ID });
		await time.msleep(100);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(sortedIds(state.notes)).toEqual(sortedIds([note1, note2]));
		expect(note1.parent_id).toEqual(folder1.id);

		// TEST ACTION: change the notes parent
		await Note.moveToFolder(note1.id, folder2.id);
		await time.msleep(100);

		// check the note is duplicated and the view updated
		state = testApp.store().getState();
		expect(state.notes.length).toEqual(2);
		let n1 = await Note.load(note1.id);
		expect(n1.parent_id).toEqual(folder2.id);

		// TEST ACTION: change the notes parent
		await Note.moveToFolder(note1.id, folder1.id);
		await time.msleep(100);

		// check the note is duplicated and the view updated
		state = testApp.store().getState();
		expect(state.notes.length).toEqual(2);
		n1 = await Note.load(note1.id);
		expect(n1.parent_id).toEqual(folder1.id);
	}));
});
