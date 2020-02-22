/* eslint-disable no-unused-vars */
require('app-module-path').addPath(__dirname);
const { setupDatabaseAndSynchronizer, switchClient, asyncTest, TestApp } = require('test-utils.js');
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
// In particular, this file contains integration tests for smart filter features.
//

async function createNTestFolders(n) {
	let folders = [];
	for (let i = 0; i < n; i++) {
		let folder = await Folder.save({ title: 'folder' });
		folders.push(folder);
	}
	return folders;
}

async function createNTestNotes(n, folder) {
	let notes = [];
	for (let i = 0; i < n; i++) {
		let note = await Note.save({ title: 'note', parent_id: folder.id, is_conflict: 0 });
		notes.push(note);
	}
	return notes;
}

async function createNTestTags(n) {
	let tags = [];
	for (let i = 0; i < n; i++) {
		let tag = await Tag.save({ title: 'tag' });
		tags.push(tag);
	}
	return tags;
}

// use this until Javascript arr.flat() function works in Travis
function flatten(arr) {
	return (arr.reduce((acc, val) => acc.concat(val), []));
}

let testApp = null;

describe('integration_SmartFilters', function() {

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

	it('should show notes in a folder', asyncTest(async () => {
		let folders = await createNTestFolders(2);
		let notes = [];
		for (let i = 0; i < folders.length; i++) {
			notes.push(await createNTestNotes(3, folders[i]));
		}

		testApp.dispatch({
			type: 'FOLDER_SELECT',
			id: folders[1].id,
		});
		await time.msleep(100);

		let state = testApp.store().getState();

		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(folders[1].id);

		let expectedNoteIds = notes[1].map(n => n.id).sort();
		let noteIds = state.notes.map(n => n.id).sort();
		expect(noteIds).toEqual(expectedNoteIds);
	}));

	it('should show all notes', asyncTest(async () => {
		let folders = await createNTestFolders(2);
		let notes = [];
		for (let i = 0; i < folders.length; i++) {
			notes.push(await createNTestNotes(3, folders[i]));
		}

		testApp.dispatch({
			type: 'SMART_FILTER_SELECT',
			id: ALL_NOTES_FILTER_ID,
		});
		await time.msleep(100);

		let state = testApp.store().getState();

		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(ALL_NOTES_FILTER_ID);

		// let expectedNoteIds = notes.map(n => n.map(o => o.id)).flat().sort();
		let expectedNoteIds = flatten(notes.map(n => n.map(o => o.id))).sort();
		let noteIds = state.notes.map(n => n.id).sort();
		expect(noteIds).toEqual(expectedNoteIds);
	}));
});
