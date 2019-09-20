import { asyncTest, clearDatabase, supportDir, createUserAndSession } from '../testUtils';
import FileController from '../../app/controllers/FileController';
import FileModel from '../../app/models/FileModel';
import * as fs from 'fs-extra';
import { File } from '../../app/db';

describe('FileController', function() {

	beforeEach(async (done) => {
		await clearDatabase();
		done();
	});

	it('should create a file', asyncTest(async function() {
		const { session } = await createUserAndSession(true);

		const file:File = {
			name: 'photo.jpg',
			content: await fs.readFile(`${supportDir}/photo.jpg`),
			mime_type: 'image/jpeg',
			parent_id: '',
		};

		const fileController = new FileController();
		let newFile = await fileController.createFile(session.id, file);

		expect(!!newFile.id).toBe(true);
		expect(newFile.name).toBe(file.name);
		expect(newFile.mime_type).toBe(file.mime_type);
		expect(!!newFile.parent_id).toBe(true);
		expect(!newFile.content).toBe(true);

		const fileModel = new FileModel();
		newFile = await fileModel.load(newFile.id);

		expect(!!newFile).toBe(true);

		const originalFileHex = (file.content as Buffer).toString('hex');
		const newFileHex = (newFile.content as Buffer).toString('hex');
		expect(newFileHex.length > 0).toBe(true);
		expect(newFileHex).toBe(originalFileHex);
	}));

});
