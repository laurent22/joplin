/* eslint-disable no-unused-vars */
require('app-module-path').addPath(__dirname);
const { setupDatabaseAndSynchronizer, switchClient, asyncTest, TestApp } = require('test-utils.js');
const Setting = require('lib/models/Setting.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const { time } = require('lib/time-utils.js');

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

describe('integration_TagList', function() {

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

	// the tag list should be cleared if the next note has no tags
	it('should clear tag list when a note is deleted', asyncTest(async () => {
		// setup and select the note
		let folders = await createNTestFolders(1);
		let notes = await createNTestNotes(5, folders[0]);
		let tags = await createNTestTags(3);

		await Tag.addNote(tags[2].id, notes[2].id);

		testApp.dispatch({
			type: 'FOLDER_SELECT',
			id: folders[0].id,
		});
		await time.msleep(100);

		testApp.dispatch({
			type: 'NOTE_SELECT',
			id: notes[2].id,
		});
		await time.msleep(100);

		// check the tag list is correct
		let state = testApp.store().getState();
		expect(state.selectedNoteTags.length).toEqual(1);
		expect(state.selectedNoteTags[0].id).toEqual(tags[2].id);

		// delete the note
		testApp.dispatch({
			type: 'NOTE_DELETE',
			id: notes[2].id,
		});
		await time.msleep(100);

		// check the tag list is updated
		state = testApp.store().getState();
		expect(state.selectedNoteTags.length).toEqual(0);
	}));

	// the tag list should be updated if the next note has tags
	it('should update tag list when a note is deleted', asyncTest(async () => {
		// set up and select the note
		let folders = await createNTestFolders(1);
		let notes = await createNTestNotes(5, folders[0]);
		let tags = await createNTestTags(3);

		await Tag.addNote(tags[1].id, notes[1].id);
		await Tag.addNote(tags[0].id, notes[0].id);
		await Tag.addNote(tags[2].id, notes[0].id);

		testApp.dispatch({
			type: 'FOLDER_SELECT',
			id: folders[0].id,
		});
		await time.msleep(100);

		testApp.dispatch({
			type: 'NOTE_SELECT',
			id: notes[1].id,
		});
		await time.msleep(100);

		// check the tag list is correct
		let state = testApp.store().getState();
		expect(state.selectedNoteTags.length).toEqual(1);
		expect(state.selectedNoteTags[0].id).toEqual(tags[1].id);

		// delete the note
		testApp.dispatch({
			type: 'NOTE_DELETE',
			id: notes[1].id,
		});
		await time.msleep(100);

		// check the tag list is updated
		state = testApp.store().getState();
		let tagIds = state.selectedNoteTags.map(n => n.id).sort();
		let expectedTagIds = [tags[0].id, tags[2].id].sort();
		expect(state.selectedNoteTags.length).toEqual(2);
		expect(tagIds).toEqual(expectedTagIds);
	}));
});
