/* eslint-disable no-unused-vars */
require('app-module-path').addPath(__dirname);
const { setupDatabaseAndSynchronizer, switchClient, asyncTest, id, ids, sortedIds, at, createNTestFolders, createNTestTodos, createNTestTags, TestApp } = require('test-utils.js');
const Setting = require('lib/models/Setting.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const { time } = require('lib/time-utils.js');
const { ALL_TODOS_FILTER_ID } = require('lib/reserved-ids.js');

let testApp = null;

describe('feature_ShowAllTodos', function() {

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

	it('should show all todos', asyncTest(async () => {

		const folders = await createNTestFolders(3);
		Folder.moveToFolder(id(folders[2]), id(folders[1])); // subfolder
		await testApp.wait();
		const todos0 = await createNTestTodos(3, folders[0]);
		const todos1 = await createNTestTodos(3, folders[1]);
		const todos2 = await createNTestTodos(3, folders[2]);
		await testApp.wait();

		// TEST ACTION: View all-todos
		testApp.dispatch({ type: 'SMART_FILTER_SELECT', id: ALL_TODOS_FILTER_ID });
		await testApp.wait();

		// check: all the notes are shown
		const state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(ALL_TODOS_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds(todos0.concat(todos1).concat(todos2)));
	}));

	it('should show retain note selection when going from a folder to all-todos', asyncTest(async () => {
		// setup
		const folders = await createNTestFolders(2);
		const todos0 = await createNTestTodos(3, folders[0]);
		const todos1 = await createNTestTodos(3, folders[1]);
		await testApp.wait();

		testApp.dispatch({ type: 'FOLDER_SELECT', id: id(folders[1]) });
		await testApp.wait();
		testApp.dispatch({ type: 'NOTE_SELECT',	id: id(todos1[1]) });
		await testApp.wait();

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(state.notesParentType).toEqual('Folder');
		expect(state.selectedFolderId).toEqual(id(folders[1]));
		expect(sortedIds(state.notes)).toEqual(sortedIds(todos1));
		expect(state.selectedNoteIds).toEqual(ids([todos1[1]]));

		// TEST ACTION: View all-todos
		testApp.dispatch({ type: 'SMART_FILTER_SELECT', id: ALL_TODOS_FILTER_ID });
		await testApp.wait();

		// check: all the notes are shown
		state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(state.selectedSmartFilterId).toEqual(ALL_TODOS_FILTER_ID);
		expect(sortedIds(state.notes)).toEqual(sortedIds(todos0.concat(todos1)));
		expect(state.selectedNoteIds).toEqual(ids([todos1[1]]));
	}));

	it('should support todo duplication', asyncTest(async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const todo1 = await Note.save({ title: 'todo1', parent_id: folder1.id, is_todo: true });
		const todo2 = await Note.save({ title: 'todo2', parent_id: folder2.id, is_todo: true });
		testApp.dispatch({ type: 'FOLDER_SELECT', id: folder1.id }); // active folder
		await time.msleep(100);
		testApp.dispatch({ type: 'NOTE_SELECT',	id: todo1.id });
		await time.msleep(100);
		testApp.dispatch({ type: 'SMART_FILTER_SELECT', id: ALL_TODOS_FILTER_ID });
		await time.msleep(100);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(sortedIds(state.notes)).toEqual(sortedIds([todo1, todo2]));

		// TEST ACTION: duplicate a note from the active folder
		const newTodo1 = await Note.duplicate(todo1.id);
		await time.msleep(100);

		// check the note is duplicated and the view updated
		state = testApp.store().getState();
		expect(state.notes.length).toEqual(3);
		expect(sortedIds(state.notes)).toEqual(sortedIds([todo1, todo2, newTodo1]));

		// TEST ACTION: duplicate a note from a non-active folder
		const newTodo2 = await Note.duplicate(todo1.id);
		await time.msleep(100);

		// check the note is duplicated and the view updated
		state = testApp.store().getState();
		expect(state.notes.length).toEqual(4);
		expect(sortedIds(state.notes)).toEqual(sortedIds([todo1, todo2, newTodo1, newTodo2]));
	}));

	it('should support changing the todo parent', asyncTest(async () => {
		// setup
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const todo1 = await Note.save({ title: 'todo1', parent_id: folder1.id, is_todo: true });
		const todo2 = await Note.save({ title: 'todo1', parent_id: folder2.id, is_todo: true });
		testApp.dispatch({ type: 'FOLDER_SELECT', id: folder1.id }); // active folder
		await time.msleep(100);
		testApp.dispatch({ type: 'NOTE_SELECT',	id: todo1.id });
		await time.msleep(100);
		testApp.dispatch({ type: 'SMART_FILTER_SELECT', id: ALL_TODOS_FILTER_ID });
		await time.msleep(100);

		// check the state is set up as expected
		let state = testApp.store().getState();
		expect(state.notesParentType).toEqual('SmartFilter');
		expect(sortedIds(state.notes)).toEqual(sortedIds([todo1, todo2]));
		expect(todo1.parent_id).toEqual(folder1.id);

		// TEST ACTION: change the notes parent
		await Note.moveToFolder(todo1.id, folder2.id);
		await time.msleep(100);

		// check the note is duplicated and the view updated
		state = testApp.store().getState();
		expect(state.notes.length).toEqual(2);
		let n1 = await Note.load(todo1.id);
		expect(n1.parent_id).toEqual(folder2.id);

		// TEST ACTION: change the notes parent
		await Note.moveToFolder(todo1.id, folder1.id);
		await time.msleep(100);

		// check the note is duplicated and the view updated
		state = testApp.store().getState();
		expect(state.notes.length).toEqual(2);
		n1 = await Note.load(todo1.id);
		expect(n1.parent_id).toEqual(folder1.id);
	}));

});
