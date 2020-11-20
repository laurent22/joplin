/* eslint-disable no-unused-vars */
const { setupDatabaseAndSynchronizer, switchClient, asyncTest, createNTestFolders, createNTestNotes, createNTestTags, TestApp } = require('./test-utils.js');
const Setting = require('@joplin/lib/models/Setting').default;
const Folder = require('@joplin/lib/models/Folder.js');
const Note = require('@joplin/lib/models/Note.js');
const Tag = require('@joplin/lib/models/Tag.js');
const time = require('@joplin/lib/time').default;

let testApp = null;

describe('integration_NoteList', function() {

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

	// Reference: https://github.com/laurent22/joplin/issues/2709
	it('should leave a conflict note in the conflict folder when it modified', asyncTest(async () => {
		const folder = await Folder.save({ title: 'test' });
		const note = await Note.save({ title: 'note 1', parent_id: folder.id, is_conflict: 1 });
		await testApp.wait();

		testApp.dispatch({ type: 'FOLDER_SELECT', id: Folder.conflictFolderId() });
		await testApp.wait();

		testApp.dispatch({ type: 'NOTE_SELECT',	id: note.id });
		await testApp.wait();

		// Check that the conflict folder is selected and that the conflict note is inside
		let state = testApp.store().getState();
		expect(state.selectedFolderId).toBe(Folder.conflictFolderId());
		expect(state.selectedNoteIds[0]).toBe(note.id);

		await Note.save({ id: note.id, title: 'note 1 mod', is_conflict: 1 });
		await testApp.wait();

		// Check that the conflict folder is still selected with the note still inside
		state = testApp.store().getState();
		expect(state.selectedFolderId).toBe(Folder.conflictFolderId());
		expect(state.selectedNoteIds[0]).toBe(note.id);
	}));

});
