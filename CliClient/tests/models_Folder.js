/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const BaseModel = require('lib/BaseModel.js');
const { shim } = require('lib/shim');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

async function allItems() {
	let folders = await Folder.all();
	let notes = await Note.all();
	return folders.concat(notes);
}

describe('models_Folder', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should tell if a notebook can be nested under another one', asyncTest(async () => {
		let f1 = await Folder.save({ title: 'folder1' });
		let f2 = await Folder.save({ title: 'folder2', parent_id: f1.id });
		let f3 = await Folder.save({ title: 'folder3', parent_id: f2.id });
		let f4 = await Folder.save({ title: 'folder4' });

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
		let f1 = await Folder.save({ title: 'folder1' });
		let f2 = await Folder.save({ title: 'folder2', parent_id: f1.id });
		let n1 = await Note.save({ title: 'note1', parent_id: f2.id });

		await Folder.delete(f1.id);

		const all = await allItems();
		expect(all.length).toBe(0);
	}));

	it('should sort by last modified, based on content', asyncTest(async () => {
		let folders;

		let f1 = await Folder.save({ title: 'folder1' }); await sleep(0.1);
		let f2 = await Folder.save({ title: 'folder2' }); await sleep(0.1);
		let f3 = await Folder.save({ title: 'folder3' }); await sleep(0.1);
		let n1 = await Note.save({ title: 'note1', parent_id: f2.id });

		folders = await Folder.orderByLastModified(await Folder.all(), 'desc');
		expect(folders.length).toBe(3);
		expect(folders[0].id).toBe(f2.id);
		expect(folders[1].id).toBe(f3.id);
		expect(folders[2].id).toBe(f1.id);

		let n2 = await Note.save({ title: 'note1', parent_id: f1.id });

		folders = await Folder.orderByLastModified(await Folder.all(), 'desc');
		expect(folders[0].id).toBe(f1.id);
		expect(folders[1].id).toBe(f2.id);
		expect(folders[2].id).toBe(f3.id);

		await Note.save({ id: n1.id, title: 'note1 mod' });

		folders = await Folder.orderByLastModified(await Folder.all(), 'desc');
		expect(folders[0].id).toBe(f2.id);
		expect(folders[1].id).toBe(f1.id);
		expect(folders[2].id).toBe(f3.id);

		folders = await Folder.orderByLastModified(await Folder.all(), 'asc');
		expect(folders[0].id).toBe(f3.id);
		expect(folders[1].id).toBe(f1.id);
		expect(folders[2].id).toBe(f2.id);
	}));

	it('should sort by last modified, based on content (sub-folders too)', asyncTest(async () => {
		let folders;

		let f1 = await Folder.save({ title: 'folder1' }); await sleep(0.1);
		let f2 = await Folder.save({ title: 'folder2' }); await sleep(0.1);
		let f3 = await Folder.save({ title: 'folder3', parent_id: f1.id }); await sleep(0.1);
		let n1 = await Note.save({ title: 'note1', parent_id: f3.id });

		folders = await Folder.orderByLastModified(await Folder.all(), 'desc');
		expect(folders.length).toBe(3);
		expect(folders[0].id).toBe(f1.id);
		expect(folders[1].id).toBe(f3.id);
		expect(folders[2].id).toBe(f2.id);

		let n2 = await Note.save({ title: 'note2', parent_id: f2.id });
		folders = await Folder.orderByLastModified(await Folder.all(), 'desc');

		expect(folders[0].id).toBe(f2.id);
		expect(folders[1].id).toBe(f1.id);
		expect(folders[2].id).toBe(f3.id);

		await Note.save({ id: n1.id, title: 'note1 MOD' });

		folders = await Folder.orderByLastModified(await Folder.all(), 'desc');
		expect(folders[0].id).toBe(f1.id);
		expect(folders[1].id).toBe(f3.id);
		expect(folders[2].id).toBe(f2.id);

		let f4 = await Folder.save({ title: 'folder4', parent_id: f1.id }); await sleep(0.1);
		let n3 = await Note.save({ title: 'note3', parent_id: f4.id });

		folders = await Folder.orderByLastModified(await Folder.all(), 'desc');
		expect(folders.length).toBe(4);
		expect(folders[0].id).toBe(f1.id);
		expect(folders[1].id).toBe(f4.id);
		expect(folders[2].id).toBe(f3.id);
		expect(folders[3].id).toBe(f2.id);
	}));

	it('should add node counts', asyncTest(async () => {
		let f1 = await Folder.save({ title: 'folder1' });
		let f2 = await Folder.save({ title: 'folder2', parent_id: f1.id });
		let f3 = await Folder.save({ title: 'folder3', parent_id: f2.id });
		let f4 = await Folder.save({ title: 'folder4' });

		let n1 = await Note.save({ title: 'note1', parent_id: f3.id });
		let n2 = await Note.save({ title: 'note1', parent_id: f3.id });
		let n3 = await Note.save({ title: 'note1', parent_id: f1.id });

		const folders = await Folder.all();
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

		let f1 = await Folder.save({ title: 'folder1' });
		let f2 = await Folder.save({ title: 'folder2', parent_id: f1.id });
		let f3 = await Folder.save({ title: 'folder3', parent_id: f2.id });
		let f4 = await Folder.save({ title: 'folder4' });

		let n1 = await Note.save({ title: 'note1', parent_id: f3.id });
		let n2 = await Note.save({ title: 'note2', parent_id: f3.id });
		let n3 = await Note.save({ title: 'note3', parent_id: f1.id });
		let n4 = await Note.save({ title: 'note4', parent_id: f3.id, is_todo: true, todo_completed: 0 });
		let n5 = await Note.save({ title: 'note5', parent_id: f3.id, is_todo: true, todo_completed: 999 });
		let n6 = await Note.save({ title: 'note6', parent_id: f3.id, is_todo: true, todo_completed: 999 });

		const folders = await Folder.all();
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

		let f1 = await Folder.save({ title: 'folder1' });
		let f2 = await Folder.save({ title: 'folder2', parent_id: f1.id });
		let f3 = await Folder.save({ title: 'folder3', parent_id: f2.id });

		const folders = await Folder.all();
		const folderPath = await Folder.folderPath(folders, f3.id);

		expect(folderPath.length).toBe(3);
		expect(folderPath[0].id).toBe(f1.id);
		expect(folderPath[1].id).toBe(f2.id);
		expect(folderPath[2].id).toBe(f3.id);
	}));

});
