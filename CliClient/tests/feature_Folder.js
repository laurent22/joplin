/* eslint-disable no-unused-vars */
require('app-module-path').addPath(__dirname);
const { setupDatabaseAndSynchronizer, switchClient, asyncTest, checkThrowAsync, id, ids, sortedIds, at, createNTestNotes, createNTestFolders, createNTestTags, createNTestTodos } = require('test-utils.js');
const { TestApp, actions } = require('test-feature-utils.js');
const BaseModel = require('lib/BaseModel.js');
const Setting = require('lib/models/Setting.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const NoteTag = require('lib/models/NoteTag.js');
const SearchEngine = require('lib/services/SearchEngine');
const { time } = require('lib/time-utils.js');
const { uuid } = require('lib/uuid.js');
const { ALL_NOTES_FILTER_ID, TRASH_FILTER_ID, TRASH_TAG_ID, TRASH_TAG_NAME, CONFLICT_FOLDER_ID } = require('lib/reserved-ids.js');

let testApp = null;

describe('feature_Folder', function() {

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

	it('should move note to folder from conflicts', asyncTest(async () => {
		// set up
		const folders = await createNTestFolders(1);
		const notes0 = await createNTestNotes(4, folders[0].id, null, 'Note', 1);
		const notes1 = await createNTestNotes(1, folders[0].id);
		await actions.awaitFoldersRefresh();

		await actions.viewFolder(CONFLICT_FOLDER_ID);
		await actions.selectNotes([notes0[0].id]);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0));
		expect(state.selectedNoteIds.sort()).toEqual(sortedIds([notes0[0]]));

		// TEST ACTION
		await actions.moveSelectedNotesToFolder(folders[0].id);

		// check new note is selected
		state = testApp.store().getState();
		expect(ids(state.notes)).toEqual(ids(at(notes0, [3,2,1])));
		expect(state.selectedNoteIds.sort()).toEqual(sortedIds([notes0[1]]));

		// check folder
		await actions.viewFolder(folders[0].id);
		state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes1.concat(notes0[0])));
		expect(state.selectedNoteIds).toEqual([notes1[0].id]);
	}));

	// same as previous, except moved conflict note already belongs to trash
	it('should move note to folder from conflicts (2)', asyncTest(async () => {
		// set up
		const folders = await createNTestFolders(1);
		const notes0 = await createNTestNotes(4, folders[0].id, [TRASH_TAG_ID], 'Note', 1);
		const notes1 = await createNTestNotes(1, folders[0].id);
		await actions.awaitFoldersRefresh();

		await actions.viewFolder(CONFLICT_FOLDER_ID);
		await actions.selectNotes([notes0[1].id]);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes0));
		expect(state.selectedNoteIds.sort()).toEqual(sortedIds([notes0[1]]));

		// TEST ACTION
		await actions.moveSelectedNotesToFolder(folders[0].id);

		// check new note is selected
		state = testApp.store().getState();
		expect(ids(state.notes)).toEqual(ids(at(notes0, [3,2,0])));
		expect(state.selectedNoteIds.sort()).toEqual(sortedIds([notes0[0]]));

		// check folder
		await actions.viewFolder(folders[0].id);
		state = testApp.store().getState();
		expect(sortedIds(state.notes)).toEqual(sortedIds(notes1.concat(notes0[1])));
		expect(state.selectedNoteIds.sort()).toEqual([notes1[0].id]);
	}));
});
