import { testAssetDir, beforeAllDb, randomHash, afterAllTests, beforeEachDb, createUserAndSession, models, tempDir } from '../../utils/testing/testUtils';
import { testFilePath, getFileMetadataContext, getFileMetadata, deleteFileContent, deleteFileContext, deleteFile, postDirectoryContext, postDirectory, getDirectoryChildren, putFileContentContext, putFileContent, getFileContent, patchFileContext, patchFile, getDelta } from '../../utils/testing/fileApiUtils';
import * as fs from 'fs-extra';
import { ChangeType, File } from '../../db';
import { Pagination, PaginationOrderDir } from '../../models/utils/pagination';
import { ErrorUnprocessableEntity, ErrorForbidden, ErrorNotFound, ErrorConflict } from '../../utils/errors';
import { msleep } from '../../utils/time';

async function makeTempFileWithContent(content: string): Promise<string> {
	const d = await tempDir();
	const filePath = `${d}/${randomHash()}`;
	await fs.writeFile(filePath, content, 'utf8');
	return filePath;
}

async function makeTestFile(ownerId: string, id: number = 1, ext: string = 'jpg', parentId: string = ''): Promise<File> {
	const basename = ext === 'jpg' ? 'photo' : 'poster';

	const file: File = {
		name: id > 1 ? `${basename}-${id}.${ext}` : `${basename}.${ext}`,
		content: await fs.readFile(`${testAssetDir}/${basename}.${ext}`),
		// mime_type: `image/${ext}`,
		parent_id: parentId,
	};

	return models().file({ userId: ownerId }).save(file);
}

describe('api_files', function() {

	beforeAll(async () => {
		await beforeAllDb('api_files');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should create a file', async function() {
		const { user, session } = await createUserAndSession(1, true);
		const filePath = testFilePath();

		const newFile = await putFileContent(session.id, 'root:/photo.jpg:', filePath);

		expect(!!newFile.id).toBe(true);
		expect(newFile.name).toBe('photo.jpg');
		expect(newFile.mime_type).toBe('image/jpeg');
		expect(!!newFile.parent_id).toBe(true);
		expect(!newFile.content).toBe(true);
		expect(newFile.size > 0).toBe(true);

		const fileModel = models().file({ userId: user.id });
		const newFileReload = await fileModel.loadWithContent(newFile.id);

		expect(!!newFileReload).toBe(true);

		const fileContent = await fs.readFile(filePath);
		const newFileHex = fileContent.toString('hex');
		const newFileReloadHex = (newFileReload.content as Buffer).toString('hex');
		expect(newFileReloadHex.length > 0).toBe(true);
		expect(newFileReloadHex).toBe(newFileHex);
	});

	test('should create sub-directories', async function() {
		const { session } = await createUserAndSession(1, true);

		const newDir = await postDirectory(session.id, 'root:/:', 'subdir');
		expect(!!newDir.id).toBe(true);
		expect(newDir.is_directory).toBe(1);

		const newDir2 = await postDirectory(session.id, 'root:/subdir:', 'subdir2');

		const newDirReload2 = await getFileMetadata(session.id, 'root:/subdir/subdir2:');
		expect(newDirReload2.id).toBe(newDir2.id);
		expect(newDirReload2.name).toBe(newDir2.name);
	});

	test('should create files in sub-directory', async function() {
		const { session } = await createUserAndSession(1, true);

		await postDirectory(session.id, 'root:/:', 'subdir');

		const newFile = await putFileContent(session.id, 'root:/subdir/photo.jpg:', testFilePath());

		const newFileReload = await getFileMetadata(session.id, 'root:/subdir/photo.jpg:');
		expect(newFileReload.id).toBe(newFile.id);
		expect(newFileReload.name).toBe('photo.jpg');
	});

	test('should not create a file with an invalid path', async function() {
		const { session } = await createUserAndSession(1, true);

		const context = await putFileContentContext(session.id, 'root:/does/not/exist/photo.jpg:', testFilePath());
		expect(context.response.status).toBe(ErrorNotFound.httpCode);
	});

	test('should get files', async function() {
		const { session: session1, user: user1 } = await createUserAndSession(1);
		const { user: user2 } = await createUserAndSession(2);

		let file1: File = await makeTestFile(user1.id, 1);
		const file2: File = await makeTestFile(user1.id, 2);
		const file3: File = await makeTestFile(user2.id, 3);

		const fileId1 = file1.id;
		const fileId2 = file2.id;

		// Can't get someone else file
		const context = await getFileMetadataContext(session1.id, file3.id);
		expect(context.response.status).toBe(ErrorForbidden.httpCode);

		file1 = await getFileMetadata(session1.id, file1.id);
		expect(file1.id).toBe(fileId1);

		const fileModel = models().file({ userId: user1.id });
		const paginatedResults = await getDirectoryChildren(session1.id, await fileModel.userRootFileId());
		const allFiles: File[] = paginatedResults.items;
		expect(allFiles.length).toBe(2);
		expect(JSON.stringify(allFiles.map(f => f.id).sort())).toBe(JSON.stringify([fileId1, fileId2].sort()));
	});

	test('should not let create a file in a directory not owned by user', async function() {
		const { session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		const file = await putFileContent(session2.id, 'root:/test.jpg:', testFilePath());
		const context = await getFileMetadataContext(session1.id, file.id);
		expect(context.response.status).toBe(ErrorForbidden.httpCode);
	});

	test('should update file properties', async function() {
		const { session, user } = await createUserAndSession(1, true);

		const fileModel = models().file({ userId: user.id });

		let file = await putFileContent(session.id, 'root:/test.jpg:', testFilePath());

		// Can't have file with empty name
		const context = await patchFileContext(session.id, file.id, { name: '' });
		expect(context.response.status).toBe(ErrorUnprocessableEntity.httpCode);

		await patchFile(session.id, file.id, { name: 'modified.jpg' });
		file = await fileModel.load(file.id);
		expect(file.name).toBe('modified.jpg');

		await patchFile(session.id, file.id, { mime_type: 'image/png' });
		file = await fileModel.load(file.id);
		expect(file.mime_type).toBe('image/png');
	});

	test('should not allow duplicate filenames', async function() {
		const { session } = await createUserAndSession(1, true);

		const c1 = await postDirectoryContext(session.id, 'root:/:', 'mydir');
		expect(c1.response.status).toBe(200);

		const c2 = await postDirectoryContext(session.id, 'root:/:', 'mydir');
		expect(c2.response.status).toBe(ErrorConflict.httpCode);
	});

	test('should change the file parent', async function() {
		const { session: session1, user: user1 } = await createUserAndSession(1);
		const { user: user2 } = await createUserAndSession(2);

		const fileModel = models().file({ userId: user1.id });

		let file: File = await makeTestFile(user1.id);
		const file2: File = await makeTestFile(user1.id, 2);
		const dir: File = await postDirectory(session1.id, 'root', 'mydir');

		// Can't set parent to another non-directory file
		const context1 = await patchFileContext(session1.id, file.id, { parent_id: file2.id });
		expect(context1.response.status).toBe(ErrorForbidden.httpCode);

		// Can't set parent to someone else directory
		const fileModel2 = models().file({ userId: user2.id });
		const userRoot2 = await fileModel2.userRootFile();
		const context2 = await patchFileContext(session1.id, file.id, { parent_id: userRoot2.id });
		expect(context2.response.status).toBe(ErrorForbidden.httpCode);

		// Finally, change the parent
		await patchFile(session1.id, file.id, { parent_id: dir.id });
		file = await fileModel.load(file.id);
		expect(!!file.parent_id).toBe(true);
		expect(file.parent_id).toBe(dir.id);
	});

	test('should delete a file', async function() {
		const { user, session } = await createUserAndSession(1, true);

		await makeTestFile(user.id, 1);
		const file2: File = await makeTestFile(user.id, 2);

		const fileModel = models().file({ userId: user.id });

		let allFiles: File[] = await fileModel.all();
		const beforeCount: number = allFiles.length;

		await deleteFile(session.id, file2.id);
		allFiles = await fileModel.all();
		expect(allFiles.length).toBe(beforeCount - 1);
	});

	test('should create and delete directories', async function() {
		const { user, session } = await createUserAndSession(1, true);

		const dir1 = await postDirectory(session.id, 'root', 'dir1');
		const dir2 = await postDirectory(session.id, dir1.id, 'dir2');

		const dirReload2: File = await getFileMetadata(session.id, 'root:/dir1/dir2:');
		expect(dirReload2.id).toBe(dir2.id);

		// Delete one directory
		await deleteFile(session.id, 'root:/dir1/dir2:');
		const dirNotFoundContext = await getFileMetadataContext(session.id, 'root:/dir1/dir2:');
		expect(dirNotFoundContext.response.status).toBe(ErrorNotFound.httpCode);

		// Delete a directory and its sub-directories and files
		const dir3 = await postDirectory(session.id, 'root:/dir1:', 'dir3');
		const file1 = await putFileContent(session.id, 'root:/dir1/file1:', testFilePath());
		const file2 = await putFileContent(session.id, 'root:/dir1/dir3/file2:', testFilePath());
		await deleteFile(session.id, 'root:/dir1:');

		const fileModel = models().file({ userId: user.id });
		expect(!(await fileModel.load(dir1.id))).toBe(true);
		expect(!(await fileModel.load(dir3.id))).toBe(true);
		expect(!(await fileModel.load(file1.id))).toBe(true);
		expect(!(await fileModel.load(file2.id))).toBe(true);
	});

	test('should not change the parent when updating a file', async function() {
		const { user, session } = await createUserAndSession(1, true);

		const fileModel = models().file({ userId: user.id });

		const dir1: File = await postDirectory(session.id, 'root', 'dir1');
		const file1: File = await putFileContent(session.id, 'root:/dir1/myfile.md:', await makeTempFileWithContent('testing'));

		await putFileContent(session.id, 'root:/dir1/myfile.md:', await makeTempFileWithContent('new content'));

		const fileReloaded1 = await fileModel.load(file1.id);
		expect(fileReloaded1.parent_id).toBe(dir1.id);
	});

	test('should not delete someone else file', async function() {
		const { session: session1 } = await createUserAndSession(1);
		const { user: user2 } = await createUserAndSession(2);

		const file2: File = await makeTestFile(user2.id, 2);

		const context = await deleteFileContext(session1.id, file2.id);
		expect(context.response.status).toBe(ErrorForbidden.httpCode);
	});

	test('should let admin change or delete files', async function() {
		const { session: adminSession } = await createUserAndSession(1, true);
		const { user } = await createUserAndSession(2);

		let file: File = await makeTestFile(user.id);

		const fileModel = models().file({ userId: user.id });

		await patchFile(adminSession.id, file.id, { name: 'modified.jpg' });
		file = await fileModel.load(file.id);
		expect(file.name).toBe('modified.jpg');

		await deleteFile(adminSession.id, file.id);
		expect(!(await fileModel.load(file.id))).toBe(true);
	});

	test('should update a file content', async function() {
		const { session } = await createUserAndSession(1, true);

		const contentPath1 = await makeTempFileWithContent('test1');
		const contentPath2 = await makeTempFileWithContent('test2');

		await putFileContent(session.id, 'root:/file.txt:', contentPath1);

		const originalContent = (await getFileContent(session.id, 'root:/file.txt:')).toString();
		expect(originalContent).toBe('test1');

		await putFileContent(session.id, 'root:/file.txt:', contentPath2);
		const modContent = (await getFileContent(session.id, 'root:/file.txt:')).toString();
		expect(modContent).toBe('test2');
	});

	test('should delete a file content', async function() {
		const { user, session } = await createUserAndSession(1, true);

		const file: File = await makeTestFile(user.id, 1);
		await putFileContent(session.id, file.id, await makeTempFileWithContent('test1'));

		await deleteFileContent(session.id, file.id);

		const modFile = await getFileMetadata(session.id, file.id);
		expect(modFile.size).toBe(0);
	});

	test('should not allow reserved characters', async function() {
		const { session } = await createUserAndSession(1, true);

		const filenames = [
			'invalid*invalid',
			'invalid#invalid',
			'invalid\\invalid',
		];

		for (const filename of filenames) {
			const context = await putFileContentContext(session.id, `root:/${filename}:`, testFilePath());
			expect(context.response.status).toBe(ErrorUnprocessableEntity.httpCode);
		}
	});

	test('should not allow a directory with the same name', async function() {
		const { session } = await createUserAndSession(1, true);

		{
			await postDirectory(session.id, 'root', 'somedir');
			const context = await putFileContentContext(session.id, 'root:/somedir:', testFilePath());
			expect(context.response.status).toBe(ErrorUnprocessableEntity.httpCode);
		}

		{
			await putFileContent(session.id, 'root:/somefile.md:', testFilePath());
			const context = await postDirectoryContext(session.id, 'root', 'somefile.md');
			expect(context.response.status).toBe(ErrorConflict.httpCode);
		}
	});

	test('should not be possible to delete the root directory', async function() {
		const { session } = await createUserAndSession(1, true);

		const context = await deleteFileContext(session.id, 'root');
		expect(context.response.status).toBe(ErrorForbidden.httpCode);
	});

	test('should support root:/: format, which means root', async function() {
		const { session, user } = await createUserAndSession(1, true);
		const fileModel = models().file({ userId: user.id });

		const root = await getFileMetadata(session.id, 'root:/:');
		expect(root.id).toBe(await fileModel.userRootFileId());
	});

	test('should paginate results', async function() {
		const { session: session1, user: user1 } = await createUserAndSession(1);

		const file1: File = await makeTestFile(user1.id, 1);
		await msleep(1);
		const file2: File = await makeTestFile(user1.id, 2);
		await msleep(1);
		const file3: File = await makeTestFile(user1.id, 3);

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
			const page1 = await getDirectoryChildren(session1.id, rootId, pagination);
			expect(page1.items.length).toBe(2);
			expect(page1.has_more).toBe(true);
			expect(page1.items[0].id).toBe(file1.id);
			expect(page1.items[1].id).toBe(file2.id);

			const p = method === 'page' ? { ...pagination, page: 2 } : { cursor: page1.cursor };
			const page2 = await getDirectoryChildren(session1.id, rootId, p);
			expect(page2.items.length).toBe(1);
			expect(page2.has_more).toBe(false);
			expect(page2.items[0].id).toBe(file3.id);
		}
	});

	test('should track file changes', async function() {
		// We only do a basic check because most of the tests for this are in
		// ChangeModel.test.ts

		const { user, session: session1 } = await createUserAndSession(1);

		const file1: File = await makeTestFile(user.id, 1);
		await msleep(1);
		const file2: File = await makeTestFile(user.id, 2);

		const page1 = await getDelta(session1.id, file1.parent_id, { limit: 1 });
		expect(page1.has_more).toBe(true);
		expect(page1.items.length).toBe(1);
		expect(page1.items[0].type).toBe(ChangeType.Create);
		expect(page1.items[0].item.id).toBe(file1.id);

		const page2 = await getDelta(session1.id, file1.parent_id, { cursor: page1.cursor, limit: 1 });
		expect(page2.has_more).toBe(true);
		expect(page2.items.length).toBe(1);
		expect(page2.items[0].type).toBe(ChangeType.Create);
		expect(page2.items[0].item.id).toBe(file2.id);

		const page3 = await getDelta(session1.id, file1.parent_id, { cursor: page2.cursor, limit: 1 });
		expect(page3.has_more).toBe(false);
		expect(page3.items.length).toBe(0);
	});

	test('should not allow creating file without auth', async function() {
		const context = await putFileContentContext('', 'root:/photo.jpg:', testFilePath());
		expect(context.response.status).toBe(ErrorForbidden.httpCode);
	});

});
