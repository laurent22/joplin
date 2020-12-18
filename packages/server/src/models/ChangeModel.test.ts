import { createUserAndSession, beforeAllDb, afterAllDb, beforeEachDb, models } from '../utils/testUtils';
import { defaultPagination } from '../models/utils/pagination';
import { ChangeType, File, ItemType } from '../db';
import FileModel from './FileModel';
import { msleep } from '../utils/time';

async function makeTestFile(fileModel:FileModel):Promise<File> {
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
		{
			const changes = (await changeModel.byOwnerId(user.id, defaultPagination())).items;
			expect(changes.length).toBe(1);
			expect(changes[0].item_type).toBe(ItemType.File);
			expect(changes[0].item_id).toBe(file1.id);
			expect(changes[0].type).toBe(ChangeType.Create);
		}		
	});

	test('should track changes - create, then update', async function() {
		const { user } = await createUserAndSession(1, true);
		const fileModel = models().file({ userId: user.id });
		const changeModel = models().change({ userId: user.id });

		let i = 1;
		await msleep(5); const file1 = await makeTestFile(fileModel);
		await msleep(5); await fileModel.save({ id: file1.id, name: 'test_mod' + i++ });
		await msleep(5); await fileModel.save({ id: file1.id, name: 'test_mod' + i++ });
		await msleep(5); const file2 = await makeTestFile(fileModel);
		await msleep(5); await fileModel.save({ id: file2.id, name: 'test_mod' + i++ });
		await msleep(5); await fileModel.save({ id: file2.id, name: 'test_mod' + i++ });
		await msleep(5); await fileModel.save({ id: file2.id, name: 'test_mod' + i++ });
		await msleep(5); await fileModel.delete(file1.id);
		await msleep(5); await makeTestFile(fileModel);


		// {
		// 	const changes = (await changeModel.byOwnerId(user.id, defaultPagination())).items;
		// 	expect(changes.length).toBe(1);
		// 	expect(changes[0].item_type).toBe(ItemType.File);
		// 	expect(changes[0].item_id).toBe(file1.id);
		// 	expect(changes[0].type).toBe(ChangeType.Create);
		// }
	});

});
