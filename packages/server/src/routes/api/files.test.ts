import routeHandler from '../../middleware/routeHandler';
import { testAssetDir, beforeAllDb, afterAllDb, beforeEachDb, koaAppContext, createUserAndSession, models } from '../../utils/testing/testUtils';
import * as fs from 'fs-extra';

function testFilePath(ext: string = 'jpg') {
	const basename = ext === 'jpg' ? 'photo' : 'poster';
	return `${testAssetDir}/${basename}.${ext}`;
}

describe('api_files', function() {

	beforeAll(async () => {
		await beforeAllDb('api_files');
	});

	afterAll(async () => {
		await afterAllDb();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should create a file', async function() {
		const { user, session } = await createUserAndSession(1, true);
		const filePath = testFilePath();

		const context = await koaAppContext({
			sessionId: session.id,
			request: {
				method: 'PUT',
				url: '/api/files/root:/photo.jpg:/content',
				files: { file: { path: filePath } },
			},
		});

		await routeHandler(context);

		const newFile = context.response.body;

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

		const context1 = await koaAppContext({
			sessionId: session.id,
			request: {
				method: 'POST',
				url: '/api/files/root/children',
				body: {
					is_directory: 1,
					name: 'subdir',
				},
			},
		});

		await routeHandler(context1);

		const newDir = context1.response.body;
		expect(!!newDir.id).toBe(true);
		expect(newDir.is_directory).toBe(1);

		const context2 = await koaAppContext({
			sessionId: session.id,
			request: {
				method: 'POST',
				url: '/api/files/root:/subdir:/children',
				body: {
					is_directory: 1,
					name: 'subdir2',
				},
			},
		});

		await routeHandler(context2);

		const newDir2 = context2.response.body;

		const context3 = await koaAppContext({
			sessionId: session.id,
			request: {
				method: 'GET',
				url: '/api/files/root:/subdir/subdir2:',
			},
		});

		await routeHandler(context3);

		const newDirReload2 = context3.response.body;
		expect(newDirReload2.id).toBe(newDir2.id);
		expect(newDirReload2.name).toBe(newDir2.name);
	});

});
