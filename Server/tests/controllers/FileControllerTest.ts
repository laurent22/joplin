import { asyncTest, clearDatabase, supportDir, createUserAndSession } from '../testUtils';
import FileController from '../../app/controllers/FileController';
import FileModel from '../../app/models/FileModel';
import * as fs from 'fs-extra';
import { File } from '../../app/db';

async function makeTestFile(id:number = 1):Promise<File> {
	const file:File = {
		name: id > 1 ? `photo-${id}.jpg` : 'photo.jpg',
		content: await fs.readFile(`${supportDir}/photo.jpg`),
		mime_type: 'image/jpeg',
		parent_id: '',
	};

	return file;
}

// async function makeTestDirectory():Promise<File> {
// 	const file:File = {
// 		name: 'Docs',
// 		parent_id: '',
// 		is_directory: 1,
// 	};

// 	return file;
// }


describe('FileController', function() {

	beforeEach(async (done) => {
		await clearDatabase();
		done();
	});

	it('should create a file', asyncTest(async function() {
		const { user, session } = await createUserAndSession(true);

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

	// it('should update a file name', asyncTest(async function() {
	// 	const fileModel = new FileModel();

	// 	const { session } = await createUserAndSession(true);

	// 	let file:File = await makeTestFile();

	// 	const fileController = new FileController();
	// 	file = await fileController.createFile(session.id, file);

	// 	let hasThrown = false;
	// 	try {
	// 		await fileController.updateFile(session.id, file.id, { name: '' });
	// 	} catch (error) {
	// 		hasThrown = true;
	// 	}

	// 	expect(hasThrown).toBe(true);

	// 	await fileController.updateFile(session.id, file.id, { name: 'modified.jpg' });

	// 	file = await fileModel.load(file.id);
	// 	expect(file.name).toBe('modified.jpg');
	// }));

	// // TODO: Check that file with the same name cannot be added to same dir

	// it('should change the file parent', asyncTest(async function() {
	// 	const fileModel = new FileModel();

	// 	const { session } = await createUserAndSession(true);

	// 	let file:File = await makeTestFile();
	// 	let file2:File = await makeTestFile(2);
	// 	let dir:File = await makeTestDirectory();

	// 	const fileController = new FileController();
	// 	file = await fileController.createFile(session.id, file);
	// 	file2 = await fileController.createFile(session.id, file2);
	// 	dir = await fileController.createFile(session.id, dir);

	// 	let hasThrown = false;
	// 	try {
	// 		await fileController.updateFile(session.id, file.id, { parent_id: file2.id });
	// 	} catch (error) {
	// 		console.info(error);
	// 		hasThrown = true;
	// 	}

	// 	expect(hasThrown).toBe(true);

	// 	await fileController.updateFile(session.id, file.id, { parent_id: dir.id });

	// 	file = await fileModel.load(file.id);

	// 	expect(!!file.parent_id).toBe(true);
	// 	expect(file.parent_id).toBe(dir.id);
	// }));

});
