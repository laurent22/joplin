import { asyncTest, clearDatabase, supportDir, createUserAndSession, createUser, checkThrowAsync } from '../testUtils';
import FileController from '../../app/controllers/FileController';
import FileModel from '../../app/models/FileModel';
import * as fs from 'fs-extra';
import { File } from '../../app/db';
import PermissionModel from '../../app/models/PermissionModel';
import { ErrorForbidden } from '../../app/utils/errors';

async function makeTestFile(id:number = 1):Promise<File> {
	const file:File = {
		name: id > 1 ? `photo-${id}.jpg` : 'photo.jpg',
		content: await fs.readFile(`${supportDir}/photo.jpg`),
		mime_type: 'image/jpeg',
		parent_id: '',
	};

	return file;
}

async function makeTestDirectory():Promise<File> {
	const file:File = {
		name: 'Docs',
		parent_id: '',
		is_directory: 1,
	};

	return file;
}

describe('FileController', function() {

	beforeEach(async (done) => {
		await clearDatabase();
		done();
	});

	it('should create a file', asyncTest(async function() {
		const { user, session } = await createUserAndSession(1, true);

		const file:File = await makeTestFile();

		const fileController = new FileController();
		let newFile = await fileController.createFile(session.id, file);

		expect(!!newFile.id).toBe(true);
		expect(newFile.name).toBe(file.name);
		expect(newFile.mime_type).toBe(file.mime_type);
		expect(!!newFile.parent_id).toBe(true);
		expect(!newFile.content).toBe(true);

		const fileModel = new FileModel({ userId: user.id });
		newFile = await fileModel.load(newFile.id);

		expect(!!newFile).toBe(true);

		const originalFileHex = (file.content as Buffer).toString('hex');
		const newFileHex = (newFile.content as Buffer).toString('hex');
		expect(newFileHex.length > 0).toBe(true);
		expect(newFileHex).toBe(originalFileHex);
	}));

	it('should not let create a file in a directory not owned by user', asyncTest(async function() {
		const { session } = await createUserAndSession(1);

		const user2 = await createUser(2);
		const fileModel2 = new FileModel({ userId: user2.id });
		const rootFile2 = await fileModel2.userRootFile();

		const file:File = await makeTestFile();
		file.parent_id = rootFile2.id;
		const fileController = new FileController();

		const hasThrown = await checkThrowAsync(async () => fileController.createFile(session.id, file));
		expect(!!hasThrown).toBe(true);
	}));

	it('should update file properties', asyncTest(async function() {
		const { session, user } = await createUserAndSession(1, true);

		const fileModel = new FileModel({ userId: user.id });

		let file:File = await makeTestFile();

		const fileController = new FileController();
		file = await fileController.createFile(session.id, file);

		// Can't have file with empty name
		const hasThrown = await checkThrowAsync(async () =>  fileController.updateFile(session.id, { id: file.id, name: '' }));
		expect(!!hasThrown).toBe(true);

		await fileController.updateFile(session.id, { id: file.id, name: 'modified.jpg' });
		file = await fileModel.load(file.id);
		expect(file.name).toBe('modified.jpg');

		await fileController.updateFile(session.id, { id: file.id, mime_type: 'image/png' });
		file = await fileModel.load(file.id);
		expect(file.mime_type).toBe('image/png');
	}));

	it('should not allow duplicate filenames', asyncTest(async function() {
		const { session } = await createUserAndSession(1, true);

		let file1:File = await makeTestFile(1);
		let file2:File = await makeTestFile(1);

		const fileController = new FileController();
		file1 = await fileController.createFile(session.id, file1);

		expect(!!file1.id).toBe(true);
		expect(file1.name).toBe(file2.name);

		const hasThrown = await checkThrowAsync(async () => await fileController.createFile(session.id, file2));
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
		file = await fileController.createFile(session1.id, file);
		file2 = await fileController.createFile(session1.id, file2);
		dir = await fileController.createFile(session1.id, dir);

		// Can't set parent to another non-directory file
		hasThrown = await checkThrowAsync(async () => await fileController.updateFile(session1.id, { id: file.id, parent_id: file2.id }));
		expect(!!hasThrown).toBe(true);

		const fileModel2 = new FileModel({ userId: user2.id });
		const userRoot2 = await fileModel2.userRootFile();

		// Can't set parent to someone else directory
		hasThrown = await checkThrowAsync(async () => await fileController.updateFile(session1.id, { id: file.id, parent_id: userRoot2.id }));
		expect(!!hasThrown).toBe(true);

		await fileController.updateFile(session1.id, { id: file.id, parent_id: dir.id });

		file = await fileModel.load(file.id);

		expect(!!file.parent_id).toBe(true);
		expect(file.parent_id).toBe(dir.id);
	}));

	it('should delete a file', asyncTest(async function() {
		const { user, session } = await createUserAndSession(1, true);

		const fileController = new FileController();
		const fileModel = new FileModel({ userId: user.id });
		const permissionModel = new PermissionModel();

		let file1:File = await makeTestFile(1);
		let file2:File = await makeTestFile(2);

		file1 = await fileController.createFile(session.id, file1);
		file2 = await fileController.createFile(session.id, file2);
		let allFiles:File[] = await fileModel.all();
		const beforeCount:number = allFiles.length;

		expect((await permissionModel.filePermissions(file2.id)).length).toBe(1);
		await fileController.deleteFile(session.id, file2.id);
		allFiles = await fileModel.all();
		expect(allFiles.length).toBe(beforeCount - 1);
		expect((await permissionModel.filePermissions(file2.id)).length).toBe(0);
	}));

	it('should not delete someone else file', asyncTest(async function() {
		const { session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		const fileController = new FileController();

		let file1:File = await makeTestFile(1);
		let file2:File = await makeTestFile(2);

		file1 = await fileController.createFile(session1.id, file1);
		file2 = await fileController.createFile(session2.id, file2);

		const error = await checkThrowAsync(async () => await fileController.deleteFile(session1.id, file2.id));
		expect(error instanceof ErrorForbidden).toBe(true);
	}));

	it('should let admin change or delete files', asyncTest(async function() {
		const { session: adminSession } = await createUserAndSession(1, true);
		const { session, user } = await createUserAndSession(2);

		let file:File = await makeTestFile();

		const fileModel = new FileModel({ userId: user.id });
		const fileController = new FileController();
		file = await fileController.createFile(session.id, file);

		await fileController.updateFile(adminSession.id, { id: file.id, name: 'modified.jpg' });
		file = await fileModel.load(file.id);
		expect(file.name).toBe('modified.jpg');

		await fileController.deleteFile(adminSession.id, file.id);
		const error = await checkThrowAsync(async () => await fileModel.load(file.id));
		expect(!!error).toBe(true);
	}));


});
