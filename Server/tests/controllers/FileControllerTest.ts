import { asyncTest, clearDatabase, supportDir, createUserAndSession, createUser, checkThrowAsync } from '../testUtils';
import FileController from '../../app/controllers/FileController';
import FileModel from '../../app/models/FileModel';
import * as fs from 'fs-extra';
import { File } from '../../app/db';
import { ErrorForbidden, ErrorNotFound, ErrorUnprocessableEntity } from '../../app/utils/errors';
import { filePathInfo } from '../../app/utils/routeUtils';

async function makeTestFile(id:number = 1, ext:string = 'jpg', parentId:string = ''):Promise<File> {
	const basename = ext === 'jpg' ? 'photo' : 'poster';

	const file:File = {
		name: id > 1 ? `${basename}-${id}.${ext}` : `${basename}.${ext}`,
		content: await fs.readFile(`${supportDir}/${basename}.${ext}`),
		mime_type: `image/${ext}`,
		parent_id: parentId,
	};

	return file;
}

async function makeTestContent(ext:string = 'jpg') {
	const basename = ext === 'jpg' ? 'photo' : 'poster';
	return await fs.readFile(`${supportDir}/${basename}.${ext}`);
}

async function makeTestDirectory(name:string = 'Docs'):Promise<File> {
	const file:File = {
		name: name,
		parent_id: '',
		is_directory: 1,
	};

	return file;
}

async function saveTestFile(sessionId:string, path:string):Promise<File> {
	const fileController = new FileController();

	return fileController.putFileContent(
		sessionId,
		path,
		null,
	);
}

async function saveTestDir(sessionId:string, path:string):Promise<File> {
	const fileController = new FileController();

	const parsed = filePathInfo(path);

	return fileController.postChild(
		sessionId,
		parsed.dirname,
		{
			name: parsed.basename,
			is_directory: 1,
		},
	);
}

describe('FileController', function() {

	beforeEach(async (done) => {
		await clearDatabase();
		done();
	});

	it('should create a file', asyncTest(async function() {
		const { user, session } = await createUserAndSession(1, true);

		const fileController = new FileController();
		const fileContent = await makeTestContent();

		let newFile = await fileController.putFileContent(
			session.id,
			'root:/photo.jpg:',
			fileContent,
		);

		expect(!!newFile.id).toBe(true);
		expect(newFile.name).toBe('photo.jpg');
		expect(newFile.mime_type).toBe('image/jpeg');
		expect(!!newFile.parent_id).toBe(true);
		expect(!newFile.content).toBe(true);
		expect(newFile.size > 0).toBe(true);

		const fileModel = new FileModel({ userId: user.id });
		const newFileReload = await fileModel.loadWithContent(newFile.id);

		expect(!!newFileReload).toBe(true);

		const newFileHex = fileContent.toString('hex');
		const newFileReloadHex = (newFileReload.content as Buffer).toString('hex');
		expect(newFileReloadHex.length > 0).toBe(true);
		expect(newFileReloadHex).toBe(newFileHex);
	}));

	it('should create sub-directories', asyncTest(async function() {
		const { session } = await createUserAndSession(1, true);

		const fileController = new FileController();

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
	}));

	it('should create files in sub-directory', asyncTest(async function() {
		const { session } = await createUserAndSession(1, true);

		const fileController = new FileController();

		await fileController.postFile_(session.id, {
			is_directory: 1,
			name: 'subdir',
		});

		const newFile = await fileController.putFileContent(
			session.id,
			'root:/subdir/photo.jpg:',
			await makeTestContent(),
		);

		const newFileReload = await fileController.getFile(session.id, 'root:/subdir/photo.jpg');
		expect(newFileReload.id).toBe(newFile.id);
		expect(newFileReload.name).toBe('photo.jpg');
	}));

	it('should not create a file with an invalid path', asyncTest(async function() {
		const { session } = await createUserAndSession(1, true);

		const fileController = new FileController();
		const fileContent = await makeTestContent();

		const error = await checkThrowAsync(async () => fileController.putFileContent(
			session.id,
			'root:/does/not/exist/photo.jpg:',
			fileContent,
		));

		expect(error instanceof ErrorNotFound).toBe(true);
	}));

	it('should get files', asyncTest(async function() {
		const { session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		let file1:File = await makeTestFile(1);
		let file2:File = await makeTestFile(2);
		let file3:File = await makeTestFile(3);

		const fileController = new FileController();
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

		const allFiles = await fileController.getAll(session1.id);
		expect(allFiles.length).toBe(2);
		expect(JSON.stringify(allFiles.map(f => f.id).sort())).toBe(JSON.stringify([fileId1, fileId2].sort()));
	}));

	it('should not let create a file in a directory not owned by user', asyncTest(async function() {
		const { session } = await createUserAndSession(1);

		const user2 = await createUser(2);
		const fileModel2 = new FileModel({ userId: user2.id });
		const rootFile2 = await fileModel2.userRootFile();

		const file:File = await makeTestFile();
		file.parent_id = rootFile2.id;
		const fileController = new FileController();

		const hasThrown = await checkThrowAsync(async () => fileController.postFile_(session.id, file));
		expect(!!hasThrown).toBe(true);
	}));

	it('should update file properties', asyncTest(async function() {
		const { session, user } = await createUserAndSession(1, true);

		const fileModel = new FileModel({ userId: user.id });

		let file:File = await makeTestFile();

		const fileController = new FileController();
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
	}));

	it('should not allow duplicate filenames', asyncTest(async function() {
		const { session } = await createUserAndSession(1, true);

		let file1:File = await makeTestFile(1);
		let file2:File = await makeTestFile(1);

		const fileController = new FileController();
		file1 = await fileController.postFile_(session.id, file1);

		expect(!!file1.id).toBe(true);
		expect(file1.name).toBe(file2.name);

		const hasThrown = await checkThrowAsync(async () => await fileController.postFile_(session.id, file2));
		expect(!!hasThrown).toBe(true);
	}));

	it('should change the file parent', asyncTest(async function() {
		const { session: session1, user: user1 } = await createUserAndSession(1);
		const { user: user2 } = await createUserAndSession(2);
		let hasThrown:any = null;

		const fileModel = new FileModel({ userId: user1.id });

		let file:File = await makeTestFile();
		let file2:File = await makeTestFile(2);
		let dir:File = await makeTestDirectory();

		const fileController = new FileController();
		file = await fileController.postFile_(session1.id, file);
		file2 = await fileController.postFile_(session1.id, file2);
		dir = await fileController.postFile_(session1.id, dir);

		// Can't set parent to another non-directory file
		hasThrown = await checkThrowAsync(async () => await fileController.patchFile(session1.id, file.id, { parent_id: file2.id }));
		expect(!!hasThrown).toBe(true);

		const fileModel2 = new FileModel({ userId: user2.id });
		const userRoot2 = await fileModel2.userRootFile();

		// Can't set parent to someone else directory
		hasThrown = await checkThrowAsync(async () => await fileController.patchFile(session1.id, file.id, { parent_id: userRoot2.id }));
		expect(!!hasThrown).toBe(true);

		await fileController.patchFile(session1.id, file.id, { parent_id: dir.id });

		file = await fileModel.load(file.id);

		expect(!!file.parent_id).toBe(true);
		expect(file.parent_id).toBe(dir.id);
	}));

	it('should delete a file', asyncTest(async function() {
		const { user, session } = await createUserAndSession(1, true);

		const fileController = new FileController();
		const fileModel = new FileModel({ userId: user.id });

		let file1:File = await makeTestFile(1);
		let file2:File = await makeTestFile(2);

		file1 = await fileController.postFile_(session.id, file1);
		file2 = await fileController.postFile_(session.id, file2);
		let allFiles:File[] = await fileModel.all();
		const beforeCount:number = allFiles.length;

		await fileController.deleteFile(session.id, file2.id);
		allFiles = await fileModel.all();
		expect(allFiles.length).toBe(beforeCount - 1);
	}));

	it('should create and delete directories', asyncTest(async function() {
		const { user, session } = await createUserAndSession(1, true);

		const fileController = new FileController();

		const dir1:File = await fileController.postChild(session.id, 'root', { name: 'dir1', is_directory: 1 });
		const dir2:File = await fileController.postChild(session.id, 'root:/dir1', { name: 'dir2', is_directory: 1 });

		let dirReload2:File = await fileController.getFile(session.id, 'root:/dir1/dir2');
		expect(dirReload2.id).toBe(dir2.id);

		// Delete one directory
		await fileController.deleteFile(session.id, 'root:/dir1/dir2');
		let error = await checkThrowAsync(async () => fileController.getFile(session.id, 'root:/dir1/dir2'));
		expect(error instanceof ErrorNotFound).toBe(true);

		// Delete a directory and its sub-directories and files
		const dir3:File = await fileController.postChild(session.id, 'root:/dir1', { name: 'dir3', is_directory: 1 });
		const file1:File = await fileController.postFile_(session.id, { name: 'file1', parent_id: dir1.id });
		const file2:File = await fileController.postFile_(session.id, { name: 'file2', parent_id: dir3.id });
		await fileController.deleteFile(session.id, 'root:/dir1');
		const fileModel = new FileModel({ userId: user.id });
		expect(!(await fileModel.load(dir1.id))).toBe(true);
		expect(!(await fileModel.load(dir3.id))).toBe(true);
		expect(!(await fileModel.load(file1.id))).toBe(true);
		expect(!(await fileModel.load(file2.id))).toBe(true);
	}));

	it('should not change the parent when updating a file', asyncTest(async function() {
		const { user, session } = await createUserAndSession(1, true);

		const fileController = new FileController();
		const fileModel = new FileModel({ userId: user.id });

		const dir1:File = await fileController.postChild(session.id, 'root', { name: 'dir1', is_directory: 1 });
		const file1:File = await fileController.putFileContent(session.id, 'root:/dir1/myfile.md', Buffer.from('testing'));

		await fileController.putFileContent(session.id, 'root:/dir1/myfile.md', Buffer.from('new content'));
		const fileReloaded1 = await fileModel.load(file1.id);

		expect(fileReloaded1.parent_id).toBe(dir1.id);
	}));

	it('should not delete someone else file', asyncTest(async function() {
		const { session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		const fileController = new FileController();

		let file1:File = await makeTestFile(1);
		let file2:File = await makeTestFile(2);

		file1 = await fileController.postFile_(session1.id, file1);
		file2 = await fileController.postFile_(session2.id, file2);

		const error = await checkThrowAsync(async () => await fileController.deleteFile(session1.id, file2.id));
		expect(error instanceof ErrorForbidden).toBe(true);
	}));

	it('should let admin change or delete files', asyncTest(async function() {
		const { session: adminSession } = await createUserAndSession(1, true);
		const { session, user } = await createUserAndSession(2);

		let file:File = await makeTestFile();

		const fileModel = new FileModel({ userId: user.id });
		const fileController = new FileController();
		file = await fileController.postFile_(session.id, file);

		await fileController.patchFile(adminSession.id, file.id, { name: 'modified.jpg' });
		file = await fileModel.load(file.id);
		expect(file.name).toBe('modified.jpg');

		await fileController.deleteFile(adminSession.id, file.id);
		expect(!(await fileModel.load(file.id))).toBe(true);
	}));

	it('should update a file content', asyncTest(async function() {
		const { session } = await createUserAndSession(1, true);

		const file:File = await makeTestFile(1);
		const file2:File = await makeTestFile(2, 'png');

		const fileController = new FileController();
		let newFile = await fileController.postFile_(session.id, file);
		await fileController.putFileContent(session.id, newFile.id, file2.content);

		const modFile = await fileController.getFileContent(session.id, newFile.id);

		const originalFileHex = (file.content as Buffer).toString('hex');
		const modFileHex = (modFile.content as Buffer).toString('hex');
		expect(modFileHex.length > 0).toBe(true);
		expect(modFileHex === originalFileHex).toBe(false);
		expect(modFile.size).toBe(modFile.content.byteLength);
		expect(newFile.size).toBe(file.content.byteLength);
	}));

	it('should not allow reserved characters', asyncTest(async function() {
		const { session } = await createUserAndSession(1, true);

		const filenames = [
			'invalid*invalid',
			'invalid#invalid',
			'invalid\\invalid',
		];

		const fileController = new FileController();

		for (const filename of filenames) {
			const error = await checkThrowAsync(async () => fileController.putFileContent(session.id, `root:/${filename}`, null));
			expect(error instanceof ErrorUnprocessableEntity).toBe(true);
		}
	}));

	it('should not allow a directory with the same name', asyncTest(async function() {
		const { session } = await createUserAndSession(1, true);

		await saveTestDir(session.id, 'root:/somedir:');
		let error = await checkThrowAsync(async () => saveTestFile(session.id, 'root:/somedir:'));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);

		await saveTestFile(session.id, 'root:/somefile.md:');
		error = await checkThrowAsync(async () => saveTestDir(session.id, 'root:/somefile.md:'));
		expect(error instanceof ErrorUnprocessableEntity).toBe(true);
	}));

	it('should not be possible to delete the root directory', asyncTest(async function() {
		const { session } = await createUserAndSession(1, true);
		const fileController = new FileController();

		const error = await checkThrowAsync(async () => fileController.deleteFile(session.id, 'root'));
		expect(error instanceof ErrorForbidden).toBe(true);
	}));

});
