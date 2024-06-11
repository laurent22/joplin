import { ErrorCode } from '../errors';
import { FolderEntity } from '../services/database/types';
import { createNTestNotes, setupDatabaseAndSynchronizer, sleep, switchClient, checkThrowAsync, createFolderTree, simulateReadOnlyShareEnv, expectThrow } from '../testing/test-utils';
import Folder from './Folder';
import Note from './Note';

async function allItems() {
	const folders = await Folder.all();
	const notes = await Note.all();
	return folders.concat(notes);
}

describe('models/Folder', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should tell if a folder can be nested under another one', (async () => {
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

	it('should recursively delete notes and sub-folders', (async () => {
		const f1 = await Folder.save({ title: 'folder1' });
		const f2 = await Folder.save({ title: 'folder2', parent_id: f1.id });
		const f3 = await Folder.save({ title: 'folder3', parent_id: f2.id });
		const f4 = await Folder.save({ title: 'folder4', parent_id: f1.id });

		const noOfNotes = 20;
		await createNTestNotes(noOfNotes, f1, null, 'note1');
		await createNTestNotes(noOfNotes, f2, null, 'note2');
		await createNTestNotes(noOfNotes, f3, null, 'note3');
		await createNTestNotes(noOfNotes, f4, null, 'note4');

		await Folder.delete(f1.id);

		const all = await allItems();
		expect(all.length).toBe(0);
	}));

	it('should sort by last modified, based on content', (async () => {
		let folders;

		const f1 = await Folder.save({ title: 'folder1' }); await sleep(0.1);
		const f2 = await Folder.save({ title: 'folder2' }); await sleep(0.1);
		const f3 = await Folder.save({ title: 'folder3' }); await sleep(0.1);
		const n1 = await Note.save({ title: 'note1', parent_id: f2.id });

		folders = await Folder.orderByLastModified(await Folder.all(), 'desc');
		expect(folders.length).toBe(3);
		expect(folders[0].id).toBe(f2.id);
		expect(folders[1].id).toBe(f3.id);
		expect(folders[2].id).toBe(f1.id);

		await Note.save({ title: 'note1', parent_id: f1.id });

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

	it('should sort by last modified, based on content (sub-folders too)', (async () => {
		let folders;

		const f1 = await Folder.save({ title: 'folder1' }); await sleep(0.1);
		const f2 = await Folder.save({ title: 'folder2' }); await sleep(0.1);
		const f3 = await Folder.save({ title: 'folder3', parent_id: f1.id }); await sleep(0.1);
		const n1 = await Note.save({ title: 'note1', parent_id: f3.id });

		folders = await Folder.orderByLastModified(await Folder.all(), 'desc');
		expect(folders.length).toBe(3);
		expect(folders[0].id).toBe(f1.id);
		expect(folders[1].id).toBe(f3.id);
		expect(folders[2].id).toBe(f2.id);

		await Note.save({ title: 'note2', parent_id: f2.id });
		folders = await Folder.orderByLastModified(await Folder.all(), 'desc');

		expect(folders[0].id).toBe(f2.id);
		expect(folders[1].id).toBe(f1.id);
		expect(folders[2].id).toBe(f3.id);

		await Note.save({ id: n1.id, title: 'note1 MOD' });

		folders = await Folder.orderByLastModified(await Folder.all(), 'desc');
		expect(folders[0].id).toBe(f1.id);
		expect(folders[1].id).toBe(f3.id);
		expect(folders[2].id).toBe(f2.id);

		const f4 = await Folder.save({ title: 'folder4', parent_id: f1.id }); await sleep(0.1);
		await Note.save({ title: 'note3', parent_id: f4.id });

		folders = await Folder.orderByLastModified(await Folder.all(), 'desc');
		expect(folders.length).toBe(4);
		expect(folders[0].id).toBe(f1.id);
		expect(folders[1].id).toBe(f4.id);
		expect(folders[2].id).toBe(f3.id);
		expect(folders[3].id).toBe(f2.id);
	}));

	it('should add node counts', (async () => {
		const f1 = await Folder.save({ title: 'folder1' });
		const f2 = await Folder.save({ title: 'folder2', parent_id: f1.id });
		const f3 = await Folder.save({ title: 'folder3', parent_id: f2.id });
		const f4 = await Folder.save({ title: 'folder4' });

		await Note.save({ title: 'note1', parent_id: f3.id });
		await Note.save({ title: 'note1', parent_id: f3.id });
		await Note.save({ title: 'note1', parent_id: f1.id });
		await Note.save({ title: 'conflicted', parent_id: f1.id, is_conflict: 1 });

		{
			const folders = await Folder.all({ includeConflictFolder: false });
			await Folder.addNoteCounts(folders);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const foldersById: any = {};
			// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
			folders.forEach((f: FolderEntity) => { foldersById[f.id] = f; });

			expect(folders.length).toBe(4);
			expect(foldersById[f1.id].note_count).toBe(3);
			expect(foldersById[f2.id].note_count).toBe(2);
			expect(foldersById[f3.id].note_count).toBe(2);
			expect(foldersById[f4.id].note_count).toBe(0);
		}

		{
			const folders = await Folder.all({ includeConflictFolder: true });
			await Folder.addNoteCounts(folders);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const foldersById: any = {};
			// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
			folders.forEach((f: FolderEntity) => { foldersById[f.id] = f; });

			expect(folders.length).toBe(5);
			expect(foldersById[Folder.conflictFolderId()].note_count).toBe(1);
		}
	}));

	it('should not count completed to-dos', (async () => {

		const f1 = await Folder.save({ title: 'folder1' });
		const f2 = await Folder.save({ title: 'folder2', parent_id: f1.id });
		const f3 = await Folder.save({ title: 'folder3', parent_id: f2.id });
		const f4 = await Folder.save({ title: 'folder4' });

		await Note.save({ title: 'note1', parent_id: f3.id });
		await Note.save({ title: 'note2', parent_id: f3.id });
		await Note.save({ title: 'note3', parent_id: f1.id });
		await Note.save({ title: 'note4', parent_id: f3.id, is_todo: 1, todo_completed: 0 });
		await Note.save({ title: 'note5', parent_id: f3.id, is_todo: 1, todo_completed: 999 });
		await Note.save({ title: 'note6', parent_id: f3.id, is_todo: 1, todo_completed: 999 });

		const folders = await Folder.all();
		await Folder.addNoteCounts(folders, false);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const foldersById: any = {};
		// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
		folders.forEach((f: FolderEntity) => { foldersById[f.id] = f; });

		expect(folders.length).toBe(4);
		expect(foldersById[f1.id].note_count).toBe(4);
		expect(foldersById[f2.id].note_count).toBe(3);
		expect(foldersById[f3.id].note_count).toBe(3);
		expect(foldersById[f4.id].note_count).toBe(0);
	}));

	it('should recursively find folder path', (async () => {
		const f1 = await Folder.save({ title: 'folder1' });
		const f2 = await Folder.save({ title: 'folder2', parent_id: f1.id });
		const f3 = await Folder.save({ title: 'folder3', parent_id: f2.id });

		const folders = await Folder.all();
		const folderPath = await Folder.folderPath(folders, f3.id);

		expect(folderPath.length).toBe(3);
		expect(folderPath[0].id).toBe(f1.id);
		expect(folderPath[1].id).toBe(f2.id);
		expect(folderPath[2].id).toBe(f3.id);
	}));

	it('should sort folders alphabetically', (async () => {
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

	it('should sort folders with special chars alphabetically', (async () => {
		const unsortedFolderTitles = ['ç', 'd', 'c', 'Ä', 'b', 'a'].map(firstChar => `${firstChar} folder`);
		for (const folderTitle of unsortedFolderTitles) {
			await Folder.save({ title: folderTitle });
		}

		const folders = await Folder.allAsTree();
		const sortedFolderTree = await Folder.sortFolderTree(folders);

		// same set of titles, but in alphabetical order
		const sortedFolderTitles = ['a', 'Ä', 'b', 'c', 'ç', 'd'].map(firstChar => `${firstChar} folder`);
		expect(sortedFolderTree.map(f => f.title)).toEqual(sortedFolderTitles);
	}));

	it('should sort numbers ascending', (async () => {
		const unsortedFolderTitles = ['10', '1', '2'].map(firstChar => `${firstChar} folder`);
		for (const folderTitle of unsortedFolderTitles) {
			await Folder.save({ title: folderTitle });
		}

		const folders = await Folder.allAsTree();
		const sortedFolderTree = await Folder.sortFolderTree(folders);

		// same set of titles, but in ascending order
		const sortedFolderTitles = ['1', '2', '10'].map(firstChar => `${firstChar} folder`);
		expect(sortedFolderTree.map(f => f.title)).toEqual(sortedFolderTitles);
	}));

	it('should not allow setting a folder parent as itself', (async () => {
		const f1 = await Folder.save({ title: 'folder1' });
		const hasThrown = await checkThrowAsync(() => Folder.save({ id: f1.id, parent_id: f1.id }, { userSideValidation: true }));
		expect(hasThrown).toBe(true);
	}));

	it('should get all the children of a folder', (async () => {
		const folder = await createFolderTree('', [
			{
				title: 'folder 1',
				children: [
					{
						title: 'note 1',
					},
					{
						title: 'note 2',
					},
					{
						title: 'folder 2',
						children: [
							{
								title: 'note 3',
							},
						],
					},
					{
						title: 'folder 3',
						children: [],
					},
				],
			},
			{
				title: 'folder 4',
				children: [
					{
						title: 'folder 5',
						children: [],
					},
				],
			},
		]);

		const folder2 = await Folder.loadByTitle('folder 2');
		const folder3 = await Folder.loadByTitle('folder 3');
		const folder4 = await Folder.loadByTitle('folder 4');
		const folder5 = await Folder.loadByTitle('folder 5');

		{
			const children = await Folder.allChildrenFolders(folder.id);
			expect(children.map(c => c.id).sort()).toEqual([folder2.id, folder3.id].sort());
		}

		{
			const children = await Folder.allChildrenFolders(folder4.id);
			expect(children.map(c => c.id).sort()).toEqual([folder5.id].sort());
		}

		{
			const children = await Folder.allChildrenFolders(folder5.id);
			expect(children.map(c => c.id).sort()).toEqual([].sort());
		}
	}));

	it('should not allow creating a new folder as a child of a read-only folder', async () => {
		const cleanup = simulateReadOnlyShareEnv('123456789');

		const readonlyFolder = await Folder.save({ share_id: '123456789' });
		await expectThrow(async () => Folder.save({ parent_id: readonlyFolder.id }), ErrorCode.IsReadOnly);

		cleanup();
	});

	it('should not allow moving a folder as a child of a read-only folder', async () => {
		const cleanup = simulateReadOnlyShareEnv('123456789');

		const readonlyFolder = await Folder.save({ share_id: '123456789' });
		const folder = await Folder.save({});
		await expectThrow(async () => Folder.save({ id: folder.id, parent_id: readonlyFolder.id }), ErrorCode.IsReadOnly);

		cleanup();
	});

	it('should not allow modifying a read-only folder', async () => {
		const cleanup = simulateReadOnlyShareEnv('123456789');

		const readonlyFolder = await Folder.save({ share_id: '123456789' });
		await expectThrow(async () => Folder.save({ id: readonlyFolder.id, title: 'cannot do that' }), ErrorCode.IsReadOnly);

		cleanup();
	});

	it('should not allow deleting a read-only folder', async () => {
		const cleanup = simulateReadOnlyShareEnv('123456789');

		const readonlyFolder = await Folder.save({ share_id: '123456789' });
		await expectThrow(async () => Folder.delete(readonlyFolder.id), ErrorCode.IsReadOnly);

		cleanup();
	});

	it('should allow deleting a folder to trash', async () => {
		const folder1 = await Folder.save({});
		const folder2 = await Folder.save({});
		const note1 = await Note.save({ parent_id: folder1.id });
		const note2 = await Note.save({ parent_id: folder1.id });
		const note3 = await Note.save({ parent_id: folder2.id });

		const beforeTime = Date.now();
		await Folder.delete(folder1.id, { toTrash: true, deleteChildren: true });

		expect((await Folder.load(folder1.id)).deleted_time).toBeGreaterThanOrEqual(beforeTime);
		expect((await Folder.load(folder2.id)).deleted_time).toBe(0);
		expect((await Note.load(note1.id)).deleted_time).toBeGreaterThanOrEqual(beforeTime);
		expect((await Note.load(note2.id)).deleted_time).toBeGreaterThanOrEqual(beforeTime);
		expect((await Note.load(note3.id)).deleted_time).toBe(0);
	});

	it('should delete and set the parent ID', async () => {
		const folder1 = await Folder.save({});
		const folder2 = await Folder.save({});

		await Folder.delete(folder1.id, { toTrash: true });
		await Folder.delete(folder2.id, { toTrash: true, toTrashParentId: folder1.id });

		expect((await Folder.load(folder2.id)).parent_id).toBe(folder1.id);

		// But it should not allow moving a folder to itself
		await expectThrow(async () => Folder.delete(folder2.id, { toTrash: true, toTrashParentId: folder2.id }));
	});

	it('should filter out the trash folder and the deleted folders', async () => {
		let folders: FolderEntity[] = [];

		expect(Folder.getRealFolders(folders).length).toBe(0);

		const folder1 = await Folder.save({});
		const folder2 = await Folder.save({ parent_id: folder1.id });
		const folder3 = await Folder.save({ parent_id: folder2.id });

		folders = await Folder.all();
		expect(Folder.getRealFolders(folders).sort((a, b) => a.created_time - b.created_time)).toEqual([folder1, folder2, folder3]);

		await Folder.delete(folder2.id, { toTrash: true });
		folders = await Folder.all();
		expect(Folder.getRealFolders(folders)).toEqual([folder1]);

		await Folder.delete(folder1.id, { toTrash: true });
		folders = await Folder.all();
		expect(Folder.getRealFolders(folders).length).toBe(0);
	});

	it('should tell if at least one folder other than trash and deleted exists', async () => {
		let folders: FolderEntity[] = [];
		expect(Folder.atLeastOneRealFolderExists(folders)).toBe(false);

		folders = await Folder.all({ includeTrash: true });
		expect(Folder.atLeastOneRealFolderExists(folders)).toBe(false);

		const f1 = await Folder.save({ title: 'folder1' });
		folders = await Folder.all({ includeTrash: true });
		expect(Folder.atLeastOneRealFolderExists(folders)).toBe(true);

		await Folder.delete(f1.id, { toTrash: true });
		folders = await Folder.all({ includeTrash: true });
		expect(Folder.atLeastOneRealFolderExists(folders)).toBe(false);
	});

});
