/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync, ids, sortedIds, createNTestFolders, createNTestNotes } = require('test-utils.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const BaseModel = require('lib/BaseModel.js');
const { shim } = require('lib/shim');
const { CONFLICT_FOLDER_ID, ORPHANS_FOLDER_ID, TRASH_TAG_ID, TRASH_TAG_NAME } = require('lib/reserved-ids');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

async function allItems() {
	const folders = await Folder.all({ includeTrash: true });
	const notes = await Note.all({ includeTrash: true });
	return folders.concat(notes);
}

describe('models_Folder', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should tell if a notebook can be nested under another one', asyncTest(async () => {
		const f1 = await Folder.save({ title: 'folder1' });
		const f2 = await Folder.save({ title: 'folder2', parent_id: f1.id });
		const f3 = await Folder.save({ title: 'folder3', parent_id: f2.id });
		const f4 = await Folder.save({ title: 'folder4' });

		expect(await Folder.canNestUnder(f1.id, f2.id)).toBe(false);
		expect(await Folder.canNestUnder(f2.id, f2.id)).toBe(false);
		expect(await Folder.canNestUnder(f3.id, f1.id)).toBe(true);
		expect(await Folder.canNestUnder(f4.id, f1.id)).toBe(true);
		expect(await Folder.canNestUnder(f2.id, f3.id)).toBe(false);
		expect(await Folder.canNestUnder(f3.id, f2.id)).toBe(true);
		expect(await Folder.canNestUnder(f1.id, '')).toBe(true);
		expect(await Folder.canNestUnder(f2.id, '')).toBe(true);
	}));

	it('should recursively delete notes and sub-notebooks', asyncTest(async () => {
		const f1 = await Folder.save({ title: 'folder1' });
		const f2 = await Folder.save({ title: 'folder2', parent_id: f1.id });
		const f3 = await Folder.save({ title: 'folder3', parent_id: f2.id });
		const f4 = await Folder.save({ title: 'folder4', parent_id: f1.id });

		const noOfNotes = 20;
		await createNTestNotes(noOfNotes, f1.id, null, 'note1');
		await createNTestNotes(noOfNotes, f2.id, null, 'note2');
		await createNTestNotes(noOfNotes, f3.id, null, 'note3');
		await createNTestNotes(noOfNotes, f4.id, null, 'note4');

		await Folder.delete(f1.id);

		const all = await allItems();
		expect(all.length).toBe(0);
	}));

	it('should sort by last modified, based on content', asyncTest(async () => {
		let folders;

		const f1 = await Folder.save({ title: 'folder1' }); await sleep(0.1);
		const f2 = await Folder.save({ title: 'folder2' }); await sleep(0.1);
		const f3 = await Folder.save({ title: 'folder3' }); await sleep(0.1);
		const n1 = await Note.save({ title: 'note1', parent_id: f2.id });

		folders = await Folder.orderByLastModified(await Folder.all({ includeTrash: true }), 'desc');
		expect(folders.length).toBe(3);
		expect(folders[0].id).toBe(f2.id);
		expect(folders[1].id).toBe(f3.id);
		expect(folders[2].id).toBe(f1.id);

		const n2 = await Note.save({ title: 'note1', parent_id: f1.id });

		folders = await Folder.orderByLastModified(await Folder.all({ includeTrash: true }), 'desc');
		expect(folders[0].id).toBe(f1.id);
		expect(folders[1].id).toBe(f2.id);
		expect(folders[2].id).toBe(f3.id);

		await Note.save({ id: n1.id, title: 'note1 mod' });

		folders = await Folder.orderByLastModified(await Folder.all({ includeTrash: true }), 'desc');
		expect(folders[0].id).toBe(f2.id);
		expect(folders[1].id).toBe(f1.id);
		expect(folders[2].id).toBe(f3.id);

		folders = await Folder.orderByLastModified(await Folder.all({ includeTrash: true }), 'asc');
		expect(folders[0].id).toBe(f3.id);
		expect(folders[1].id).toBe(f1.id);
		expect(folders[2].id).toBe(f2.id);
	}));

	it('should sort by last modified, based on content (sub-folders too)', asyncTest(async () => {
		let folders;

		const f1 = await Folder.save({ title: 'folder1' }); await sleep(0.1);
		const f2 = await Folder.save({ title: 'folder2' }); await sleep(0.1);
		const f3 = await Folder.save({ title: 'folder3', parent_id: f1.id }); await sleep(0.1);
		const n1 = await Note.save({ title: 'note1', parent_id: f3.id });

		folders = await Folder.orderByLastModified(await Folder.all({ includeTrash: true }), 'desc');
		expect(folders.length).toBe(3);
		expect(folders[0].id).toBe(f1.id);
		expect(folders[1].id).toBe(f3.id);
		expect(folders[2].id).toBe(f2.id);

		const n2 = await Note.save({ title: 'note2', parent_id: f2.id });
		folders = await Folder.orderByLastModified(await Folder.all({ includeTrash: true }), 'desc');

		expect(folders[0].id).toBe(f2.id);
		expect(folders[1].id).toBe(f1.id);
		expect(folders[2].id).toBe(f3.id);

		await Note.save({ id: n1.id, title: 'note1 MOD' });

		folders = await Folder.orderByLastModified(await Folder.all({ includeTrash: true }), 'desc');
		expect(folders[0].id).toBe(f1.id);
		expect(folders[1].id).toBe(f3.id);
		expect(folders[2].id).toBe(f2.id);

		const f4 = await Folder.save({ title: 'folder4', parent_id: f1.id }); await sleep(0.1);
		const n3 = await Note.save({ title: 'note3', parent_id: f4.id });

		folders = await Folder.orderByLastModified(await Folder.all({ includeTrash: true }), 'desc');
		expect(folders.length).toBe(4);
		expect(folders[0].id).toBe(f1.id);
		expect(folders[1].id).toBe(f4.id);
		expect(folders[2].id).toBe(f3.id);
		expect(folders[3].id).toBe(f2.id);
	}));

	it('should add note counts', asyncTest(async () => {
		const f1 = await Folder.save({ title: 'folder1' });
		const f2 = await Folder.save({ title: 'folder2', parent_id: f1.id });
		const f3 = await Folder.save({ title: 'folder3', parent_id: f2.id });
		const f4 = await Folder.save({ title: 'folder4' });

		const n1 = await Note.save({ title: 'note1', parent_id: f3.id });
		const n2 = await Note.save({ title: 'note1', parent_id: f3.id });
		const n3 = await Note.save({ title: 'note1', parent_id: f1.id });

		const folders = await Folder.all({ includeTrash: false });
		await Folder.addNoteCounts(folders);

		const foldersById = {};
		folders.forEach((f) => { foldersById[f.id] = f; });

		expect(folders.length).toBe(4);
		expect(foldersById[f1.id].note_count).toBe(3);
		expect(foldersById[f2.id].note_count).toBe(2);
		expect(foldersById[f3.id].note_count).toBe(2);
		expect(foldersById[f4.id].note_count).toBe(0);
	}));

	it('should not count completed to-dos', asyncTest(async () => {

		const f1 = await Folder.save({ title: 'folder1' });
		const f2 = await Folder.save({ title: 'folder2', parent_id: f1.id });
		const f3 = await Folder.save({ title: 'folder3', parent_id: f2.id });
		const f4 = await Folder.save({ title: 'folder4' });

		const n1 = await Note.save({ title: 'note1', parent_id: f3.id });
		const n2 = await Note.save({ title: 'note2', parent_id: f3.id });
		const n3 = await Note.save({ title: 'note3', parent_id: f1.id });
		const n4 = await Note.save({ title: 'note4', parent_id: f3.id, is_todo: true, todo_completed: 0 });
		const n5 = await Note.save({ title: 'note5', parent_id: f3.id, is_todo: true, todo_completed: 999 });
		const n6 = await Note.save({ title: 'note6', parent_id: f3.id, is_todo: true, todo_completed: 999 });

		const folders = await Folder.all({ includeTrash: false });
		await Folder.addNoteCounts(folders, false);

		const foldersById = {};
		folders.forEach((f) => { foldersById[f.id] = f; });

		expect(folders.length).toBe(4);
		expect(foldersById[f1.id].note_count).toBe(4);
		expect(foldersById[f2.id].note_count).toBe(3);
		expect(foldersById[f3.id].note_count).toBe(3);
		expect(foldersById[f4.id].note_count).toBe(0);
	}));

	it('should recursively find folder path', asyncTest(async () => {
		const f1 = await Folder.save({ title: 'folder1' });
		const f2 = await Folder.save({ title: 'folder2', parent_id: f1.id });
		const f3 = await Folder.save({ title: 'folder3', parent_id: f2.id });

		const folders = await Folder.all({ includeTrash: false });
		const folderPath = await Folder.folderPath(folders, f3.id);

		expect(folderPath.length).toBe(3);
		expect(folderPath[0].id).toBe(f1.id);
		expect(folderPath[1].id).toBe(f2.id);
		expect(folderPath[2].id).toBe(f3.id);
	}));

	it('should sort folders alphabetically', asyncTest(async () => {
		const f1 = await Folder.save({ title: 'folder1' });
		const f2 = await Folder.save({ title: 'folder2', parent_id: f1.id });
		const f3 = await Folder.save({ title: 'folder3', parent_id: f1.id });
		const f4 = await Folder.save({ title: 'folder4' });
		const f5 = await Folder.save({ title: 'folder5', parent_id: f4.id });
		const f6 = await Folder.save({ title: 'folder6' });

		const folders = await Folder.allAsTree();
		const sortedFolderTree = await Folder.sortFolderTree(folders);

		expect(sortedFolderTree.length).toBe(3);
		expect(sortedFolderTree[0].id).toBe(f1.id);
		expect(sortedFolderTree[0].children[0].id).toBe(f2.id);
		expect(sortedFolderTree[0].children[1].id).toBe(f3.id);
		expect(sortedFolderTree[1].id).toBe(f4.id);
		expect(sortedFolderTree[1].children[0].id).toBe(f5.id);
		expect(sortedFolderTree[2].id).toBe(f6.id);
	}));

	it('should not include notes in trash in count', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const f1 = await Folder.save({ title: 'folder1' });
		const f2 = await Folder.save({ title: 'folder2', parent_id: f1.id });
		const f3 = await Folder.save({ title: 'folder3', parent_id: f2.id });
		const n1 = await Note.save({ title: 'note1', parent_id: f1.id });
		const n2 = await Note.save({ title: 'note2', parent_id: f1.id });
		const n3 = await Note.save({ title: 'note3', parent_id: f2.id });
		const n4 = await Note.save({ title: 'note4', parent_id: f2.id });
		const n5 = await Note.save({ title: 'note5', parent_id: f3.id });
		const n6 = await Note.save({ title: 'note6', parent_id: f3.id });
		const n7 = await Note.save({ title: 'note7', parent_id: f3.id, is_todo: 1 });
		const n8 = await Note.save({ title: 'note8', parent_id: f3.id, is_todo: 1, todo_completed: 1 });

		// trash some notes
		await Tag.setNoteTagsByIds(n2.id, [TRASH_TAG_ID]);
		await Tag.setNoteTagsByIds(n4.id, [TRASH_TAG_ID]);
		await Tag.setNoteTagsByIds(n6.id, [TRASH_TAG_ID]);

		// check while including completed todos
		let folders = await Folder.all(); // excluding trash
		await Folder.addNoteCounts(folders, true);

		let foldersById = {};
		folders.forEach((f) => { foldersById[f.id] = f; });

		expect(folders.length).toBe(3);
		expect(foldersById[f1.id].note_count).toBe(5);
		expect(foldersById[f2.id].note_count).toBe(4);
		expect(foldersById[f3.id].note_count).toBe(3);

		// check while not including completed todos
		folders = await Folder.all(); // excluding trash
		await Folder.addNoteCounts(folders, false);

		foldersById = {};
		folders.forEach((f) => { foldersById[f.id] = f; });

		expect(folders.length).toBe(3);
		expect(foldersById[f1.id].note_count).toBe(4);
		expect(foldersById[f2.id].note_count).toBe(3);
		expect(foldersById[f3.id].note_count).toBe(2);
	}));

	it('should find all sub-notebooks in a notebook', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const f1 = await Folder.save({ title: 'folder1' });
		const f2 = await Folder.save({ title: 'folder2', parent_id: f1.id });
		const f3 = await Folder.save({ title: 'folder3', parent_id: f1.id });
		const f4 = await Folder.save({ title: 'folder4', parent_id: f3.id });
		const f5 = await Folder.save({ title: 'folder5', parent_id: f3.id });

		await Tag.addFolder(TRASH_TAG_ID, f5.id);

		// try from the top
		let subfolders = await Folder.allSubFolderIds(f1.id, { includeTrash: true });
		expect(subfolders.sort()).toEqual([f2.id, f3.id, f4.id, f5.id].sort());

		// try from a mid-level
		subfolders = await Folder.allSubFolderIds(f3.id, { includeTrash: true });
		expect(subfolders.sort()).toEqual([f4.id, f5.id].sort());

		// try from a leaf
		subfolders = await Folder.allSubFolderIds(f4.id, { includeTrash: true });
		expect(subfolders).toEqual([]);

		const hasThrown = await checkThrowAsync(
			async () => await Folder.allSubFolderIds(f1.id, { includeTrash: false }));
		expect(hasThrown).toBe(true);
	}));

	it('should find all sub-notebooks in a notebook excluding trash', asyncTest(async () => {
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });
		const f1 = await Folder.save({ title: 'folder1' });
		const f2 = await Folder.save({ title: 'folder2', parent_id: f1.id });
		const f3 = await Folder.save({ title: 'folder3', parent_id: f1.id });
		const f4 = await Folder.save({ title: 'folder4', parent_id: f3.id });
		const f5 = await Folder.save({ title: 'folder5', parent_id: f3.id });
		await Folder.delete(f5.id, { permanent: false });

		const folder = Folder.load(f5.id);
		expect(!!folder).toBe(true);

		// try from the top
		let subfolders = await Folder.allSubFolderIds(f1.id, { includeTrash: true });
		expect(subfolders.sort()).toEqual([f2.id, f3.id, f4.id].sort());

		// try from a mid-level
		subfolders = await Folder.allSubFolderIds(f3.id, { includeTrash: true });
		expect(subfolders.sort()).toEqual([f4.id].sort());

		// try from a leaf
		subfolders = await Folder.allSubFolderIds(f5.id, { includeTrash: true });
		expect(subfolders).toEqual([]);
	}));

	it('should return all notes in folder', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const folders = await createNTestFolders(1);
		const notes1 = await createNTestNotes(2, folders[0].id);
		const notes2 = await createNTestNotes(3, folders[0].id, [TRASH_TAG_ID]);

		let noteIds = await Folder.noteIds(folders[0].id, { includeTrash: false });
		expect(noteIds.sort()).toEqual(sortedIds(notes1));

		noteIds = await Folder.noteIds(folders[0].id, { includeTrash: true });
		expect(noteIds.sort()).toEqual(sortedIds(notes1.concat(notes2)));

		noteIds = await Folder.noteIds(folders[0].id);
		expect(noteIds.sort()).toEqual(sortedIds(notes1));
	}));

	it('should count notes including and excluding trash notes', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const f1 = await Folder.save({ title: 'folder1' });
		const f2 = await Folder.save({ title: 'folder2', parent_id: f1.id });
		const f3 = await Folder.save({ title: 'folder3', parent_id: f2.id });

		const n1 = await Note.save({ title: 'note1', parent_id: f1.id });
		const n2 = await Note.save({ title: 'note2', parent_id: f1.id });
		const n3 = await Note.save({ title: 'note3', parent_id: f2.id });
		const n4 = await Note.save({ title: 'note4', parent_id: f2.id });
		const n5 = await Note.save({ title: 'note5', parent_id: f2.id });
		const n6 = await Note.save({ title: 'note6', parent_id: f2.id });
		const n7 = await Note.save({ title: 'note7', parent_id: f3.id });
		const n8 = await Note.save({ title: 'note8', parent_id: f3.id });
		const n9 = await Note.save({ title: 'note9', parent_id: f3.id });
		const n10 = await Note.save({ title: 'note10', parent_id: f3.id });
		const n11 = await Note.save({ title: 'note11', parent_id: f3.id });

		// trash some notes
		await Tag.setNoteTagsByIds(n2.id, [TRASH_TAG_ID]);
		await Tag.setNoteTagsByIds(n4.id, [TRASH_TAG_ID]);
		await Tag.setNoteTagsByIds(n7.id, [TRASH_TAG_ID]);

		// check while including trashed notes
		let count = await Folder.noteCount(f1.id, { includeTrash: true });
		expect(count).toBe(2);

		count = await Folder.noteCount(f2.id, { includeTrash: true });
		expect(count).toBe(4);

		count = await Folder.noteCount(f3.id, { includeTrash: true });
		expect(count).toBe(5);

		// check while excluding trashed notes
		count = await Folder.noteCount(f1.id, { includeTrash: false });
		expect(count).toBe(1);

		count = await Folder.noteCount(f2.id, { includeTrash: false });
		expect(count).toBe(3);

		count = await Folder.noteCount(f3.id, { includeTrash: false });
		expect(count).toBe(4);
	}));

	it('should exclude trashed folders in all folders list', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const folder3 = await Folder.save({ title: 'folder3' });
		const folder4 = await Folder.save({ title: 'folder4', parent_id: folder3.id });
		const folder5 = await Folder.save({ title: 'folder5' });
		const folder6 = await Folder.save({ title: 'folder6', parent_id: folder5.id });
		await Tag.addFolder(TRASH_TAG_ID, folder2.id);
		await Tag.addFolder(TRASH_TAG_ID, folder4.id);
		await Tag.addFolder(TRASH_TAG_ID, folder5.id);
		await Tag.addFolder(TRASH_TAG_ID, folder6.id);

		let folders = await Folder.all(); // excluding trash
		expect(!!folders).toBe(true);
		expect(sortedIds(folders)).toEqual(sortedIds([folder1, folder3]));

		folders = await Folder.all({ includeConflictFolder: false });
		expect(!!folders).toBe(true);
		expect(ids(folders)).toEqual([folder1.id, folder3.id]);

		folders = await Folder.all({ includeConflictFolder: true });
		expect(!!folders).toBe(true);
		expect(ids(folders)).toEqual([folder1.id, folder3.id]);
	}));

	it('should include conflicts folder in all folders list', asyncTest(async () => {
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', parent_id: folder.id });

		let folders = await Folder.all(); // excluding trash
		expect(!!folders).toBe(true);
		expect(ids(folders)).toEqual([folder.id]);

		folders = await Folder.all({ includeConflictFolder: false });
		expect(!!folders).toBe(true);
		expect(ids(folders)).toEqual([folder.id]);

		folders = await Folder.all({ includeConflictFolder: true });
		expect(!!folders).toBe(true);
		expect(ids(folders)).toEqual([folder.id]);

		const conflict = await Note.save({ title: 'conflict', parent_id: folder.id, is_conflict: 1 });

		folders = await Folder.all(); // excluding trash
		expect(!!folders).toBe(true);
		expect(ids(folders)).toEqual([folder.id]);

		folders = await Folder.all({ includeConflictFolder: false });
		expect(!!folders).toBe(true);
		expect(ids(folders)).toEqual([folder.id]);

		folders = await Folder.all({ includeConflictFolder: true });
		expect(!!folders).toBe(true);
		expect(ids(folders)).toEqual([folder.id, CONFLICT_FOLDER_ID]);
	}));

	it('should include orphans folder in all folders list', asyncTest(async () => {
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', parent_id: folder.id });

		let folders = await Folder.all(); // excluding trash
		expect(!!folders).toBe(true);
		expect(ids(folders)).toEqual([folder.id]);

		folders = await Folder.all({ includeConflictFolder: false });
		expect(!!folders).toBe(true);
		expect(ids(folders)).toEqual([folder.id]);

		folders = await Folder.all({ includeConflictFolder: true });
		expect(!!folders).toBe(true);
		expect(ids(folders)).toEqual([folder.id]);

		const orphan = await Note.save({ title: 'orphan', parent_id: ORPHANS_FOLDER_ID });

		folders = await Folder.all(); // excluding trash
		expect(!!folders).toBe(true);
		expect(ids(folders)).toEqual([folder.id]);

		folders = await Folder.all({ includeConflictFolder: false });
		expect(!!folders).toBe(true);
		expect(ids(folders)).toEqual([folder.id]);

		folders = await Folder.all({ includeConflictFolder: true });
		expect(!!folders).toBe(true);
		expect(ids(folders)).toEqual([folder.id, ORPHANS_FOLDER_ID]);
	}));

	it('should load the orphans folder', asyncTest(async () => {
		const folder = await Folder.load(ORPHANS_FOLDER_ID);
		expect(!!folder).toBe(true);
		expect(folder.title).toEqual('Orphans');
		expect(folder.type_).toEqual(BaseModel.TYPE_FOLDER);
		expect(folder.parent_id).toEqual('');
	}));

	it('should not permit nesting under orphans folder', asyncTest(async () => {
		const folder = await Folder.save({ title: 'folder' });
		const allowed = await Folder.canNestUnder(folder.id, ORPHANS_FOLDER_ID);
		expect(allowed).toBe(false);
	}));


	it('should move a folder to trash', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		// set up test scenario
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });
		await Tag.setNoteTagsByIds(note2.id, [TRASH_TAG_ID]);

		// test action
		await Folder.delete(folder1.id, { permanent: false });

		// check
		const noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.sort()).toEqual(sortedIds([note1, note2]));

		let note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		expect(note.parent_id).toEqual(note1.parent_id);

		note = await Note.load(note2.id);
		expect(!!note).toBe(true);
		expect(note.parent_id).toEqual(note1.parent_id);

		const folder = await Folder.load(folder1.id);
		expect(!!folder).toBe(true);

		const folderIds = await Tag.folderIds(TRASH_TAG_ID);
		expect(folderIds.sort()).toEqual([folder1.id]);
	}));

	it('should move a folder with subfolders to trash', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		// set up test scenario
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		const folder3 = await Folder.save({ title: 'folder3', parent_id: folder2.id });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder2.id });
		const note3 = await Note.save({ title: 'note3', parent_id: folder3.id });

		// test action
		await Folder.delete(folder2.id, { permanent: false });

		// check
		const noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.sort()).toEqual(sortedIds([note2, note3]));

		let note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		expect(note.parent_id).toEqual(note1.parent_id);

		note = await Note.load(note2.id);
		expect(!!note).toBe(true);
		expect(note.parent_id).toEqual(note2.parent_id);

		note = await Note.load(note3.id);
		expect(!!note).toBe(true);
		expect(note.parent_id).toEqual(note3.parent_id);

		let folder = await Folder.load(folder1.id);
		expect(!!folder).toBe(true);

		folder = await Folder.load(folder2.id);
		expect(!!folder).toBe(true);

		folder = await Folder.load(folder3.id);
		expect(!!folder).toBe(true);

		const folderIds = await Tag.folderIds(TRASH_TAG_ID);
		expect(folderIds.sort()).toEqual(sortedIds([folder2, folder3]));
	}));

	// tests default arguments to delete function
	it('should permanently delete a folder (1)', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		// set up test scenario
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });

		// TEST ACTION
		await Folder.delete(folder1.id);

		// check
		const noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.sort()).toEqual([]);

		let note = await Note.load(note1.id);
		expect(!!note).toBe(false);

		note = await Note.load(note2.id);
		expect(!!note).toBe(false);

		const folder = await Folder.load(folder1.id);
		expect(!!folder).toBe(false);

		const folderIds = await Tag.folderIds(TRASH_TAG_ID);
		expect(folderIds.sort()).toEqual([]);
	}));

	// as above, but explicitly specify permanent option to delete function
	it('should permanently delete a folder (2)', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		// set up test scenario
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });

		// TEST ACTION
		await Folder.delete(folder1.id, { permanent: true });

		// check
		const noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.sort()).toEqual([]);

		let note = await Note.load(note1.id);
		expect(!!note).toBe(false);

		note = await Note.load(note2.id);
		expect(!!note).toBe(false);

		const folder = await Folder.load(folder1.id);
		expect(!!folder).toBe(false);

		const folderIds = await Tag.folderIds(TRASH_TAG_ID);
		expect(folderIds.sort()).toEqual([]);
	}));

	it('should permanently delete a folder which has child note in conflicts', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		// set up test scenario
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id, is_conflict: 1 });

		// TEST ACTION
		await Folder.delete(folder1.id, { permanent: true });

		// check
		const noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.sort()).toEqual([]);

		let note = await Note.load(note1.id);
		expect(!!note).toBe(false);

		note = await Note.load(note2.id);
		expect(!!note).toBe(true);

		const folder = await Folder.load(folder1.id);
		expect(!!folder).toBe(false);

		const folderIds = await Tag.folderIds(TRASH_TAG_ID);
		expect(folderIds.sort()).toEqual([]);

		// Bonus points: move the conflict (and now orphan) to trash and restore it
		await Note.batchDelete([note2.id], { permanent: false });
		await Note.undelete([note2.id]);

		note = await Note.load(note2.id);
		expect(!!note).toBe(true);
		expect(note.is_conflict).toBe(0);
		expect(note.parent_id).toBe(ORPHANS_FOLDER_ID);
	}));

	it('should permanently delete a folder which has a subfolder with child note in conflicts', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		// set up test scenario
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder2.id, is_conflict: 1 });

		// TEST ACTION
		await Folder.delete(folder1.id, { permanent: true });

		// check
		const noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.sort()).toEqual([]);

		let note = await Note.load(note1.id);
		expect(!!note).toBe(false);

		note = await Note.load(note2.id);
		expect(!!note).toBe(true);

		let folder = await Folder.load(folder1.id);
		expect(!!folder).toBe(false);

		folder = await Folder.load(folder2.id);
		expect(!!folder).toBe(false);

		const folderIds = await Tag.folderIds(TRASH_TAG_ID);
		expect(folderIds.sort()).toEqual([]);

		// Bonus points: move the conflict (and now orphan) to trash and restore it
		await Note.batchDelete([note2.id], { permanent: false });
		await Note.undelete([note2.id]);

		note = await Note.load(note2.id);
		expect(!!note).toBe(true);
		expect(note.is_conflict).toBe(0);
		expect(note.parent_id).toBe(ORPHANS_FOLDER_ID);
	}));

	it('should permanently delete a folder with subfolders', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		// set up test scenario
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		const folder3 = await Folder.save({ title: 'folder3', parent_id: folder2.id });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder2.id });
		const note3 = await Note.save({ title: 'note3', parent_id: folder3.id });

		// test action
		await Folder.delete(folder2.id, { permanent: true });

		// check
		const noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.sort()).toEqual(sortedIds([]));

		let note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		expect(note.parent_id).toEqual(note1.parent_id);

		note = await Note.load(note2.id);
		expect(!!note).toBe(false);

		note = await Note.load(note3.id);
		expect(!!note).toBe(false);

		let folder = await Folder.load(folder1.id);
		expect(!!folder).toBe(true);

		folder = await Folder.load(folder2.id);
		expect(!!folder).toBe(false);

		folder = await Folder.load(folder3.id);
		expect(!!folder).toBe(false);

		const folderIds = await Tag.folderIds(TRASH_TAG_ID);
		expect(folderIds.sort()).toEqual(sortedIds([]));
	}));

	it('should permanently delete a folder with a child note in trash', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		// set up test scenario
		const folder1 = await Folder.save({ title: 'folder1' });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });
		await Tag.setNoteTagsByIds(note2.id, [TRASH_TAG_ID]);

		// TEST ACTION
		await Folder.delete(folder1.id);

		// check
		const noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.sort()).toEqual([note2.id]);

		let note = await Note.load(note1.id);
		expect(!!note).toBe(false);

		note = await Note.load(note2.id);
		expect(!!note).toBe(true);

		const folder = await Folder.load(folder1.id);
		expect(!!folder).toBe(true); // not deleted because the child is in trash

		const folderIds = await Tag.folderIds(TRASH_TAG_ID);
		expect(folderIds.sort()).toEqual([folder1.id]);
	}));

	it('should permanently delete a folder with a subfolder child note in trash', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		// set up test scenario
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder2.id });
		await Tag.setNoteTagsByIds(note2.id, [TRASH_TAG_ID]);

		// TEST ACTION
		await Folder.delete(folder1.id);

		// check
		const noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.sort()).toEqual([note2.id]);

		let note = await Note.load(note1.id);
		expect(!!note).toBe(false);

		note = await Note.load(note2.id);
		expect(!!note).toBe(true);

		let folder = await Folder.load(folder1.id);
		expect(!!folder).toBe(true); // not deleted because the child is in trash

		folder = await Folder.load(folder2.id);
		expect(!!folder).toBe(true); // not deleted because the child is in trash

		const folderIds = await Tag.folderIds(TRASH_TAG_ID);
		expect(folderIds.sort()).toEqual(sortedIds([folder1, folder2]));
	}));

	it('should permanently delete a subfolder', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		// set up test scenario
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2', parent_id: folder1.id });
		const folder3 = await Folder.save({ title: 'folder3', parent_id: folder2.id });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder2.id });
		const note3 = await Note.save({ title: 'note3', parent_id: folder3.id });

		// test action
		await Folder.delete(folder2.id);

		// check
		const noteIds = await Tag.noteIds(TRASH_TAG_ID);
		expect(noteIds.sort()).toEqual(sortedIds([]));

		let note = await Note.load(note1.id);
		expect(!!note).toBe(true);
		expect(note.parent_id).toEqual(note1.parent_id);

		note = await Note.load(note2.id);
		expect(!!note).toBe(false);

		note = await Note.load(note3.id);
		expect(!!note).toBe(false);

		let folder = await Folder.load(folder1.id);
		expect(!!folder).toBe(true);

		folder = await Folder.load(folder2.id);
		expect(!!folder).toBe(false);

		folder = await Folder.load(folder3.id);
		expect(!!folder).toBe(false);

		const folderIds = await Tag.folderIds(TRASH_TAG_ID);
		expect(folderIds.sort()).toEqual([]);
	}));


	it('should identify folder containing no trash', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const folder1 = await Folder.save({ title: 'folder' });
		const note11 = await Note.save({ title: 'note11', parent_id: folder1.id });
		const note12 = await Note.save({ title: 'note12', parent_id: folder1.id });

		expect(await Folder.hasTrash(folder1.id)).toEqual(false);
	}));

	it('should identify folder containing trash', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const folder2 = await Folder.save({ title: 'folder2' });
		const note21 = await Note.save({ title: 'note21', parent_id: folder2.id });
		const note22 = await Note.save({ title: 'note22', parent_id: folder2.id });
		await Tag.setNoteTagsByIds(note21.id, [TRASH_TAG_ID]);

		expect(await Folder.hasTrash(folder2.id)).toEqual(true);
	}));

	it('should identify subfolders containing no trash', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const folder3 = await Folder.save({ title: 'folder3' });
		const folder4 = await Folder.save({ title: 'folder4', parent_id: folder3.id });
		const note41 = await Note.save({ title: 'note41', parent_id: folder4.id });
		const note42 = await Note.save({ title: 'note42', parent_id: folder4.id });

		expect(await Folder.hasTrash(folder3.id)).toEqual(false);
		expect(await Folder.hasTrash(folder4.id)).toEqual(false);
	}));

	it('should identify subfolders containing trash', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const folder5 = await Folder.save({ title: 'folder5' });
		const folder6 = await Folder.save({ title: 'folder6', parent_id: folder5.id });
		const folder7 = await Folder.save({ title: 'folder7', parent_id: folder5.id });
		const note61 = await Note.save({ title: 'note61', parent_id: folder6.id });
		const note62 = await Note.save({ title: 'note62', parent_id: folder6.id });
		const note71 = await Note.save({ title: 'note71', parent_id: folder7.id });

		await Tag.setNoteTagsByIds(note61.id, [TRASH_TAG_ID]);

		expect(await Folder.hasTrash(folder5.id)).toEqual(true);
		expect(await Folder.hasTrash(folder6.id)).toEqual(true);
		expect(await Folder.hasTrash(folder7.id)).toEqual(false);
	}));

	it('should get all folders', asyncTest(async () => {
		// this system tag is assumed to exist
		await Tag.save({ title: TRASH_TAG_NAME, id: TRASH_TAG_ID }, { isNew: true });

		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const folder3 = await Folder.save({ title: 'folder3' });
		const folder4 = await Folder.save({ title: 'folder4' });
		const folder5 = await Folder.save({ title: 'folder5' });
		const folder6 = await Folder.save({ title: 'folder6' });

		await Tag.addFolder(TRASH_TAG_ID, folder4.id);
		await Tag.addFolder(TRASH_TAG_ID, folder5.id);
		await Tag.addFolder(TRASH_TAG_ID, folder6.id);

		let folders = await Folder.all();
		expect(sortedIds(folders)).toEqual(sortedIds([folder1, folder2, folder3]));

		folders = await Folder.all({ includeTrash: true });
		expect(sortedIds(folders)).toEqual(sortedIds([folder1, folder2, folder3, folder4, folder5, folder6]));

		folders = await Folder.all({ includeTrash: false });
		expect(sortedIds(folders)).toEqual(sortedIds([folder1, folder2, folder3]));
	}));
});
