import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, createFileTree } from '../utils/testing/testUtils';
import { File } from '../db';

describe('FileModel', function() {

	beforeAll(async () => {
		await beforeAllDb('FileModel');
	});

	afterAll(async () => {
		await afterAllTests();
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
			const fileBackId: string = await fileModel.pathToFileId(path);
			expect(file.id).toBe(fileBackId);
		}

		const rootPath = await fileModel.itemFullPath(await fileModel.userRootFile());
		expect(rootPath).toBe('root');
		const fileBackId: string = await fileModel.pathToFileId(rootPath);
		expect(fileBackId).toBe(rootId);
	});

	test('should resolve file paths', async function() {
		const testCases = [
			[
				['root', '.resource', 'test'],
				'root:/.resource/test:',
			],
			[
				['root:/.resource:', 'test'],
				'root:/.resource/test:',
			],
			[
				['root:/.resource:', ''],
				'root:/.resource:',
			],
			[
				['root:/.resource:'],
				'root:/.resource:',
			],
			[
				['root:/.resource:'],
				'root:/.resource:',
			],
			[
				['root'],
				'root',
			],
		];

		const fileModel = models().file();

		for (const t of testCases) {
			const [input, expected] = t;
			const actual = fileModel.resolve(...input);
			expect(actual).toBe(expected);
		}
	});

});
