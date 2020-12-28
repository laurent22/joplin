import { createUserAndSession, beforeAllDb, afterAllDb, beforeEachDb, models, createFileTree } from '../utils/testUtils';
import { File } from '../db';

describe('FileModel', function() {

	beforeAll(async () => {
		await beforeAllDb('FileModel');
	});

	afterAll(async () => {
		await afterAllDb();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should compute item full path', async function() {
		const { user } = await createUserAndSession(1, true);
		const fileModel = models().file({ userId: user.id });
		const rootId = await fileModel.userRootFileId();

		const tree: any = {
			folder1: {},
			folder2: {
				file2_1: null,
				file2_2: null,
			},
			folder3: {
				file3_1: null,
			},
			file1: null,
			file2: null,
			file3: null,
		};

		await createFileTree(fileModel, rootId, tree);

		const testCases = Object.keys(tree)
			.concat(Object.keys(tree.folder2))
			.concat(Object.keys(tree.folder3));

		for (const t of testCases) {
			const file: File = await fileModel.loadByName(t);
			const path = await fileModel.itemFullPath(file);
			const fileBack: File = await fileModel.entityFromItemId(path);
			expect(file.id).toBe(fileBack.id);
		}

		const rootPath = await fileModel.itemFullPath(await fileModel.userRootFile());
		expect(rootPath).toBe('root');
		const fileBack: File = await fileModel.entityFromItemId(rootPath);
		expect(fileBack.id).toBe(rootId);
	});

});
