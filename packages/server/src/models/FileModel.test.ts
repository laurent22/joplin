import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, createFileTree, createFile2 } from '../utils/testing/testUtils';
import { File } from '../db';

async function totalFileCount() {
	const r = await models().file().all();
	return r.length;
}

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

		const allFiles = await fileModel.all();
		const loadByName = (name: string) => {
			return allFiles.find(f => f.name === name);
		};

		for (const t of testCases) {
			const file: File = await loadByName(t);
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

	test('deleting a file should delete its linked files', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2 } = await createUserAndSession(2);
		const { user: user3 } = await createUserAndSession(3);
		const fileCountBefore = await totalFileCount();
		const file = await createFile2(session1.id, 'root:/test.txt:', 'testing');
		await models().file({ userId: user2.id }).createLink(file);
		await models().file({ userId: user3.id }).createLink(file);

		expect((await totalFileCount())).toBe(fileCountBefore + 3);

		await models().file({ userId: user1.id }).delete(file.id);

		expect((await totalFileCount())).toBe(fileCountBefore);
	});

	test('deleting a linked file should delete its source file', async function() {
		const { session: session1 } = await createUserAndSession(1);
		const { user: user2 } = await createUserAndSession(2);
		const { user: user3 } = await createUserAndSession(3);
		const fileCountBefore = await totalFileCount();
		const file = await createFile2(session1.id, 'root:/test.txt:', 'testing');
		const fileLink2 = await models().file({ userId: user2.id }).createLink(file);
		await models().file({ userId: user3.id }).createLink(file);

		expect((await totalFileCount())).toBe(fileCountBefore + 3);

		await models().file({ userId: user2.id }).delete(fileLink2.id);

		expect((await totalFileCount())).toBe(fileCountBefore);
	});

});
