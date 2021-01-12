import { createUserAndSession, beforeAllDb, afterAllDb, beforeEachDb, models, expectThrow } from '../utils/testing/testUtils';
import { ChangeType, File } from '../db';
import FileModel from './FileModel';
import { msleep } from '../utils/time';
import { ChangePagination } from './ChangeModel';

async function makeTestFile(fileModel: FileModel): Promise<File> {
	return fileModel.save({
		name: 'test',
		parent_id: await fileModel.userRootFileId(),
	});
}

describe('ChangeModel', function() {

	beforeAll(async () => {
		await beforeAllDb('ChangeModel');
	});

	afterAll(async () => {
		await afterAllDb();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should track changes - create', async function() {
		const { user } = await createUserAndSession(1, true);
		const fileModel = models().file({ userId: user.id });
		const changeModel = models().change({ userId: user.id });

		const file1 = await makeTestFile(fileModel);
		const dirId = await fileModel.userRootFileId();

		{
			const changes = (await changeModel.byDirectoryId(dirId, { limit: 20 })).items;
			expect(changes.length).toBe(1);
			expect(changes[0].item.id).toBe(file1.id);
			expect(changes[0].type).toBe(ChangeType.Create);
		}
	});

	test('should track changes - create, then update', async function() {
		const { user } = await createUserAndSession(1, true);
		const fileModel = models().file({ userId: user.id });
		const changeModel = models().change({ userId: user.id });

		let i = 1;
		await msleep(1); const file1 = await makeTestFile(fileModel); // CREATE 1
		await msleep(1); await fileModel.save({ id: file1.id, name: `test_mod${i++}` }); // UPDATE 1
		await msleep(1); await fileModel.save({ id: file1.id, name: `test_mod${i++}` }); // UPDATE 1
		await msleep(1); const file2 = await makeTestFile(fileModel); // CREATE 2
		await msleep(1); await fileModel.save({ id: file2.id, name: `test_mod${i++}` }); // UPDATE 2
		await msleep(1); await fileModel.delete(file1.id); // DELETE 1
		await msleep(1); await fileModel.save({ id: file2.id, name: `test_mod${i++}` }); // UPDATE 2
		await msleep(1); const file3 = await makeTestFile(fileModel); // CREATE 3

		const dirId = await fileModel.userRootFileId();

		{
			const changes = (await changeModel.byDirectoryId(dirId, { limit: 20 })).items;
			expect(changes.length).toBe(2);
			expect(changes[0].item.id).toBe(file2.id);
			expect(changes[0].type).toBe(ChangeType.Create);
			expect(changes[1].item.id).toBe(file3.id);
			expect(changes[1].type).toBe(ChangeType.Create);
		}

		{
			const pagination: ChangePagination = { limit: 5 };

			// In this page, the "create" change for file1 will not appear
			// because this file has been deleted. The "delete" change will
			// however appear in the second page.
			const page1 = (await changeModel.byDirectoryId(dirId, pagination));
			let changes = page1.items;
			expect(changes.length).toBe(1);
			expect(page1.has_more).toBe(true);
			expect(changes[0].item.id).toBe(file2.id);
			expect(changes[0].type).toBe(ChangeType.Create);

			const page2 = (await changeModel.byDirectoryId(dirId, { ...pagination, cursor: page1.cursor }));
			changes = page2.items;
			expect(changes.length).toBe(3);
			expect(page2.has_more).toBe(false);
			expect(changes[0].item.id).toBe(file1.id);
			expect(changes[0].type).toBe(ChangeType.Delete);
			expect(changes[1].item.id).toBe(file2.id);
			expect(changes[1].type).toBe(ChangeType.Update);
			expect(changes[2].item.id).toBe(file3.id);
			expect(changes[2].type).toBe(ChangeType.Create);
		}
	});

	test('should throw an error if cursor is invalid', async function() {
		const { user } = await createUserAndSession(1, true);
		const fileModel = models().file({ userId: user.id });
		const changeModel = models().change({ userId: user.id });

		const dirId = await fileModel.userRootFileId();

		let i = 1;
		await msleep(1); const file1 = await makeTestFile(fileModel); // CREATE 1
		await msleep(1); await fileModel.save({ id: file1.id, name: `test_mod${i++}` }); // UPDATE 1

		await expectThrow(async () => changeModel.byDirectoryId(dirId, { limit: 1, cursor: 'invalid' }), 'resyncRequired');
	});

	test('should throw an error if trying to do get changes for a file', async function() {
		const { user } = await createUserAndSession(1, true);
		const fileModel = models().file({ userId: user.id });
		const changeModel = models().change({ userId: user.id });
		const file1 = await makeTestFile(fileModel);

		await expectThrow(async () => changeModel.byDirectoryId(file1.id));
	});

});
