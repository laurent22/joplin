import { testAssetDir, createUserAndSession, createUser, checkThrowAsync, beforeAllDb, afterAllDb, beforeEachDb, models, controllers } from '../../utils/testUtils';
import * as fs from 'fs-extra';
import { ChangeType, File } from '../../db';
import { ErrorConflict, ErrorForbidden, ErrorNotFound, ErrorUnprocessableEntity } from '../../utils/errors';
import { filePathInfo } from '../../utils/routeUtils';
import { defaultPagination, Pagination, PaginationOrderDir } from '../../models/utils/pagination';
import { msleep } from '../../utils/time';

async function makeTestFile(id: number = 1, ext: string = 'jpg', parentId: string = ''): Promise<File> {
	const basename = ext === 'jpg' ? 'photo' : 'poster';

	const file: File = {
		name: id > 1 ? `${basename}-${id}.${ext}` : `${basename}.${ext}`,
		content: await fs.readFile(`${testAssetDir}/${basename}.${ext}`),
		// mime_type: `image/${ext}`,
		parent_id: parentId,
	};

	return file;
}

async function makeTestContent(ext: string = 'jpg') {
	const basename = ext === 'jpg' ? 'photo' : 'poster';
	return await fs.readFile(`${testAssetDir}/${basename}.${ext}`);
}

async function makeTestDirectory(name: string = 'Docs'): Promise<File> {
	const file: File = {
		name: name,
		parent_id: '',
		is_directory: 1,
	};

	return file;
}

async function saveTestFile(sessionId: string, path: string): Promise<File> {
	const fileController = controllers().apiFile();

	return fileController.putFileContent(
		sessionId,
		path,
		null
	);
}

async function saveTestDir(sessionId: string, path: string): Promise<File> {
	const fileController = controllers().apiFile();

	const parsed = filePathInfo(path);

	return fileController.postChild(
		sessionId,
		parsed.dirname,
		{
			name: parsed.basename,
			is_directory: 1,
		}
	);
}

describe('FileController', function() {

	beforeAll(async () => {
		await beforeAllDb('FileController');
	});

	afterAll(async () => {
		await afterAllDb();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should create a file', async function() {
		const { user, session } = await createUserAndSession(1, true);

		const fileController = controllers().apiFile();
		const fileContent = await makeTestContent();

		const newFile = await fileController.putFileContent(
			session.id,
			'root:/photo.jpg:',
			fileContent
		);

		expect(!!newFile.id).toBe(true);
		expect(newFile.name).toBe('photo.jpg');
		expect(newFile.mime_type).toBe('image/jpeg');
		expect(!!newFile.parent_id).toBe(true);
		expect(!newFile.content).toBe(true);
		expect(newFile.size > 0).toBe(true);

		const fileModel = models().file({ userId: user.id });
		const newFileReload = await fileModel.loadWithContent(newFile.id);

		expect(!!newFileReload).toBe(true);

		const newFileHex = fileContent.toString('hex');
		const newFileReloadHex = (newFileReload.content as Buffer).toString('hex');
		expect(newFileReloadHex.length > 0).toBe(true);
		expect(newFileReloadHex).toBe(newFileHex);
	});

	test('should create sub-directories', async function() {
		const { session } = await createUserAndSession(1, true);

		const fileController = controllers().apiFile();

		const newDir = await fileController.postFile_(session.id, {
			is_directory: 1,
			name: 'subdir',
		});

		expect(!!newDir.id).toBe(true);
		expect(newDir.is_directory).toBe(1);

		const newDir2 = await fileController.postFile_(session.id, {
			is_directory: 1,
			name: 'subdir2',
			parent_id: newDir.id,
		});

		const newDirReload2 = await fileController.getFile(session.id, 'root:/subdir/subdir2');
		expect(newDirReload2.id).toBe(newDir2.id);
		expect(newDirReload2.name).toBe(newDir2.name);
	});

	test('should create files in sub-directory', async function() {
		const { session } = await createUserAndSession(1, true);

		const fileController = controllers().apiFile();

		await fileController.postFile_(session.id, {
			is_directory: 1,
			name: 'subdir',
		});

		const newFile = await fileController.putFileContent(
			session.id,
			'root:/subdir/photo.jpg:',
			await makeTestContent()
		);

		const newFileReload = await fileController.getFile(session.id, 'root:/subdir/photo.jpg');
		expect(newFileReload.id).toBe(newFile.id);
		expect(newFileReload.name).toBe('photo.jpg');
	});

	test('should not create a file with an invalid path', async function() {
		const { session } = await createUserAndSession(1, true);

		const fileController = controllers().apiFile();
		const fileContent = await makeTestContent();

		const error = await checkThrowAsync(async () => fileController.putFileContent(
			session.id,
			'root:/does/not/exist/photo.jpg:',
			fileContent
		));

		expect(error instanceof ErrorNotFound).toBe(true);
	});

	test('should get files', async function() {
		const { session: session1, user: user1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		let file1: File = await makeTestFile(1);
		let file2: File = await makeTestFile(2);
		let file3: File = await makeTestFile(3);

		const fileController = controllers().apiFile();
		file1 = await fileController.postFile_(session1.id, file1);
		file2 = await fileController.postFile_(session1.id, file2);
		file3 = await fileController.postFile_(session2.id, file3);

		const fileId1 = file1.id;
		const fileId2 = file2.id;

		// Can't get someone else file
		const error = await checkThrowAsync(async () => fileController.getFile(session1.id, file3.id));
		expect(error instanceof ErrorForbidden).toBe(true);

		file1 = await fileController.getFile(session1.id, file1.id);
		expect(file1.id).toBe(fileId1);

		const fileModel = models().file({ userId: user1.id });
		const paginatedResults = await fileController.getChildren(session1.id, await fileModel.userRootFileId(), defaultPagination());
		const allFiles = paginatedResults.items;
		expect(allFiles.length).toBe(2);
		expect(JSON.stringify(allFiles.map(f => f.id).sort())).toBe(JSON.stringify([fileId1, fileId2].sort()));
	});

	test('should not let create a file in a directory not owned by user', async function() {
		const { session } = await createUserAndSession(1);

		const user2 = await createUser(2);
		const fileModel2 = models().file({ userId: user2.id });
		const rootFile2 = await fileModel2.userRootFile();

		const file: File = await makeTestFile();
		file.parent_id = rootFile2.id;
		const fileController = controllers().apiFile();

		const hasThrown = await checkThrowAsync(async () => fileController.postFile_(session.id, file));
		expect(!!hasThrown).toBe(true);
	});

	test('should update file properties', async function() {
		const { session, user } = await createUserAndSession(1, true);

		const fileModel = models().file({ userId: user.id });

		let file: File = await makeTestFile();

		const fileController = controllers().apiFile();
		file = await fileController.postFile_(session.id, file);

		// Can't have file with empty name
		const error = await checkThrowAsync(async () =>  fileController.patchFile(session.id, file.id, { name: '' }));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);

		await fileController.patchFile(session.id, file.id, { name: 'modified.jpg' });
		file = await fileModel.load(file.id);
		expect(file.name).toBe('modified.jpg');

		await fileController.patchFile(session.id, file.id, { mime_type: 'image/png' });
		file = await fileModel.load(file.id);
		expect(file.mime_type).toBe('image/png');
	});

	test('should not allow duplicate filenames', async function() {
		const { session } = await createUserAndSession(1, true);

		let file1: File = await makeTestFile(1);
		const file2: File = await makeTestFile(1);

		const fileController = controllers().apiFile();
		file1 = await fileController.postFile_(session.id, file1);

		expect(!!file1.id).toBe(true);
		expect(file1.name).toBe(file2.name);

		const hasThrown = await checkThrowAsync(async () => await fileController.postFile_(session.id, file2));
		expect(!!hasThrown).toBe(true);
	});

	test('should change the file parent', async function() {
		const { session: session1, user: user1 } = await createUserAndSession(1);
		const { user: user2 } = await createUserAndSession(2);
		let hasThrown: any = null;

		const fileModel = models().file({ userId: user1.id });

		let file: File = await makeTestFile();
		let file2: File = await makeTestFile(2);
		let dir: File = await makeTestDirectory();

		const fileController = controllers().apiFile();
		file = await fileController.postFile_(session1.id, file);
		file2 = await fileController.postFile_(session1.id, file2);
		dir = await fileController.postFile_(session1.id, dir);

		// Can't set parent to another non-directory file
		hasThrown = await checkThrowAsync(async () => await fileController.patchFile(session1.id, file.id, { parent_id: file2.id }));
		expect(!!hasThrown).toBe(true);

		const fileModel2 = models().file({ userId: user2.id });
		const userRoot2 = await fileModel2.userRootFile();

		// Can't set parent to someone else directory
		hasThrown = await checkThrowAsync(async () => await fileController.patchFile(session1.id, file.id, { parent_id: userRoot2.id }));
		expect(!!hasThrown).toBe(true);

		await fileController.patchFile(session1.id, file.id, { parent_id: dir.id });

		file = await fileModel.load(file.id);

		expect(!!file.parent_id).toBe(true);
		expect(file.parent_id).toBe(dir.id);
	});

	test('should delete a file', async function() {
		const { user, session } = await createUserAndSession(1, true);

		const fileController = controllers().apiFile();
		const fileModel = models().file({ userId: user.id });

		const file1: File = await makeTestFile(1);
		let file2: File = await makeTestFile(2);

		await fileController.postFile_(session.id, file1);
		file2 = await fileController.postFile_(session.id, file2);
		let allFiles: File[] = await fileModel.all();
		const beforeCount: number = allFiles.length;

		await fileController.deleteFile(session.id, file2.id);
		allFiles = await fileModel.all();
		expect(allFiles.length).toBe(beforeCount - 1);
	});

	test('should create and delete directories', async function() {
		const { user, session } = await createUserAndSession(1, true);

		const fileController = controllers().apiFile();

		const dir1: File = await fileController.postChild(session.id, 'root', { name: 'dir1', is_directory: 1 });
		const dir2: File = await fileController.postChild(session.id, 'root:/dir1', { name: 'dir2', is_directory: 1 });

		const dirReload2: File = await fileController.getFile(session.id, 'root:/dir1/dir2');
		expect(dirReload2.id).toBe(dir2.id);

		// Delete one directory
		await fileController.deleteFile(session.id, 'root:/dir1/dir2');
		const error = await checkThrowAsync(async () => fileController.getFile(session.id, 'root:/dir1/dir2'));
		expect(error instanceof ErrorNotFound).toBe(true);

		// Delete a directory and its sub-directories and files
		const dir3: File = await fileController.postChild(session.id, 'root:/dir1', { name: 'dir3', is_directory: 1 });
		const file1: File = await fileController.postFile_(session.id, { name: 'file1', parent_id: dir1.id });
		const file2: File = await fileController.postFile_(session.id, { name: 'file2', parent_id: dir3.id });
		await fileController.deleteFile(session.id, 'root:/dir1');
		const fileModel = models().file({ userId: user.id });
		expect(!(await fileModel.load(dir1.id))).toBe(true);
		expect(!(await fileModel.load(dir3.id))).toBe(true);
		expect(!(await fileModel.load(file1.id))).toBe(true);
		expect(!(await fileModel.load(file2.id))).toBe(true);
	});

	test('should not change the parent when updating a file', async function() {
		const { user, session } = await createUserAndSession(1, true);

		const fileController = controllers().apiFile();
		const fileModel = models().file({ userId: user.id });

		const dir1: File = await fileController.postChild(session.id, 'root', { name: 'dir1', is_directory: 1 });
		const file1: File = await fileController.putFileContent(session.id, 'root:/dir1/myfile.md', Buffer.from('testing'));

		await fileController.putFileContent(session.id, 'root:/dir1/myfile.md', Buffer.from('new content'));
		const fileReloaded1 = await fileModel.load(file1.id);

		expect(fileReloaded1.parent_id).toBe(dir1.id);
	});

	test('should not delete someone else file', async function() {
		const { session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		const fileController = controllers().apiFile();

		const file1: File = await makeTestFile(1);
		let file2: File = await makeTestFile(2);

		await fileController.postFile_(session1.id, file1);
		file2 = await fileController.postFile_(session2.id, file2);

		const error = await checkThrowAsync(async () => await fileController.deleteFile(session1.id, file2.id));
		expect(error instanceof ErrorForbidden).toBe(true);
	});

	test('should let admin change or delete files', async function() {
		const { session: adminSession } = await createUserAndSession(1, true);
		const { session, user } = await createUserAndSession(2);

		let file: File = await makeTestFile();

		const fileModel = models().file({ userId: user.id });
		const fileController = controllers().apiFile();
		file = await fileController.postFile_(session.id, file);

		await fileController.patchFile(adminSession.id, file.id, { name: 'modified.jpg' });
		file = await fileModel.load(file.id);
		expect(file.name).toBe('modified.jpg');

		await fileController.deleteFile(adminSession.id, file.id);
		expect(!(await fileModel.load(file.id))).toBe(true);
	});

	test('should update a file content', async function() {
		const { session } = await createUserAndSession(1, true);

		const file: File = await makeTestFile(1);
		const file2: File = await makeTestFile(2, 'png');

		const fileController = controllers().apiFile();
		const newFile = await fileController.postFile_(session.id, file);
		await fileController.putFileContent(session.id, newFile.id, file2.content);

		const modFile = await fileController.getFileContent(session.id, newFile.id);

		const originalFileHex = (file.content as Buffer).toString('hex');
		const modFileHex = (modFile.content as Buffer).toString('hex');
		expect(modFileHex.length > 0).toBe(true);
		expect(modFileHex === originalFileHex).toBe(false);
		expect(modFile.size).toBe(modFile.content.byteLength);
		expect(newFile.size).toBe(file.content.byteLength);
	});

	test('should delete a file content', async function() {
		const { session } = await createUserAndSession(1, true);

		const file: File = await makeTestFile(1);

		const fileController = controllers().apiFile();
		const newFile = await fileController.postFile_(session.id, file);
		await fileController.putFileContent(session.id, newFile.id, file.content);

		await fileController.deleteFileContent(session.id, newFile.id);

		const modFile = await fileController.getFile(session.id, newFile.id);
		expect(modFile.size).toBe(0);
	});

	test('should not allow reserved characters', async function() {
		const { session } = await createUserAndSession(1, true);

		const filenames = [
			'invalid*invalid',
			'invalid#invalid',
			'invalid\\invalid',
		];

		const fileController = controllers().apiFile();

		for (const filename of filenames) {
			const error = await checkThrowAsync(async () => fileController.putFileContent(session.id, `root:/${filename}`, null));
			expect(error instanceof ErrorUnprocessableEntity).toBe(true);
		}
	});

	test('should not allow a directory with the same name', async function() {
		const { session } = await createUserAndSession(1, true);

		await saveTestDir(session.id, 'root:/somedir:');
		let error = await checkThrowAsync(async () => saveTestFile(session.id, 'root:/somedir:'));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);

		await saveTestFile(session.id, 'root:/somefile.md:');
		error = await checkThrowAsync(async () => saveTestDir(session.id, 'root:/somefile.md:'));
		expect(error instanceof ErrorConflict).toBe(true);
	});

	test('should not be possible to delete the root directory', async function() {
		const { session } = await createUserAndSession(1, true);
		const fileController = controllers().apiFile();

		const error = await checkThrowAsync(async () => fileController.deleteFile(session.id, 'root'));
		expect(error instanceof ErrorForbidden).toBe(true);
	});

	test('should support root:/: format, which means root', async function() {
		const { session, user } = await createUserAndSession(1, true);
		const fileController = controllers().apiFile();
		const fileModel = models().file({ userId: user.id });

		const root = await fileController.getFile(session.id, 'root:/:');
		expect(root.id).toBe(await fileModel.userRootFileId());
	});

	test('should paginate results', async function() {
		const { session: session1, user: user1 } = await createUserAndSession(1);

		let file1: File = await makeTestFile(1);
		let file2: File = await makeTestFile(2);
		let file3: File = await makeTestFile(3);

		const fileController = controllers().apiFile();
		file1 = await fileController.postFile_(session1.id, file1);
		await msleep(1);
		file2 = await fileController.postFile_(session1.id, file2);
		await msleep(1);
		file3 = await fileController.postFile_(session1.id, file3);

		const fileModel = models().file({ userId: user1.id });
		const rootId = await fileModel.userRootFileId();

		const pagination: Pagination = {
			limit: 2,
			order: [
				{
					by: 'updated_time',
					dir: PaginationOrderDir.ASC,
				},
			],
			page: 1,
		};

		for (const method of ['page', 'cursor']) {
			const page1 = await fileController.getChildren(session1.id, rootId, pagination);
			expect(page1.items.length).toBe(2);
			expect(page1.has_more).toBe(true);
			expect(page1.items[0].id).toBe(file1.id);
			expect(page1.items[1].id).toBe(file2.id);

			const p = method === 'page' ? { ...pagination, page: 2 } : { cursor: page1.cursor };
			const page2 = await fileController.getChildren(session1.id, rootId, p);
			expect(page2.items.length).toBe(1);
			expect(page2.has_more).toBe(false);
			expect(page2.items[0].id).toBe(file3.id);
		}
	});

	test('should track file changes', async function() {
		// We only do a basic check because most of the tests for this are in
		// ChangeModel.test.ts

		const { session: session1 } = await createUserAndSession(1);

		let file1: File = await makeTestFile(1);
		let file2: File = await makeTestFile(2);

		const fileController = controllers().apiFile();
		file1 = await fileController.postFile_(session1.id, file1);
		await msleep(1); file2 = await fileController.postFile_(session1.id, file2);

		const page1 = await fileController.getDelta(session1.id, file1.parent_id, { limit: 1 });
		expect(page1.has_more).toBe(true);
		expect(page1.items.length).toBe(1);
		expect(page1.items[0].type).toBe(ChangeType.Create);
		expect(page1.items[0].item.id).toBe(file1.id);

		const page2 = await fileController.getDelta(session1.id, file1.parent_id, { cursor: page1.cursor, limit: 1 });
		expect(page2.has_more).toBe(true);
		expect(page2.items.length).toBe(1);
		expect(page2.items[0].type).toBe(ChangeType.Create);
		expect(page2.items[0].item.id).toBe(file2.id);

		const page3 = await fileController.getDelta(session1.id, file1.parent_id, { cursor: page2.cursor, limit: 1 });
		expect(page3.has_more).toBe(false);
		expect(page3.items.length).toBe(0);
	});

});
