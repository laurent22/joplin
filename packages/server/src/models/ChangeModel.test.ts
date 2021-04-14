import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, expectThrow, createItem } from '../utils/testing/testUtils';
import { ChangeType, Item } from '../db';
import { msleep } from '../utils/time';
import { ChangePagination } from './ChangeModel';
import ItemModel from './ItemModel';

let itemCounter_ = 0;
async function makeTestItem(itemModel: ItemModel): Promise<Item> {
	itemCounter_++;
	return itemModel.save({
		name: `item${itemCounter_}`,
	});
}

describe('ChangeModel', function() {

	beforeAll(async () => {
		await beforeAllDb('ChangeModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should track changes - create', async function() {
		const { session, user } = await createUserAndSession(1, true);
		const changeModel = models().change({ userId: user.id });

		const item1 = await createItem(session.id, 'test.txt', 'testing');

		{
			const changes = (await changeModel.allForUser()).items;
			expect(changes.length).toBe(1);
			expect(changes[0].item_id).toBe(item1.id);
			expect(changes[0].type).toBe(ChangeType.Create);
		}
	});

	test('should track changes - create, then update', async function() {
		const { user } = await createUserAndSession(1, true);
		const itemModel = models().item({ userId: user.id });
		const changeModel = models().change({ userId: user.id });

		let i = 1;
		await msleep(1); const item1 = await makeTestItem(itemModel); // CREATE 1
		await msleep(1); await itemModel.save({ id: item1.id, name: `test_mod${i++}` }); // UPDATE 1
		await msleep(1); await itemModel.save({ id: item1.id, name: `test_mod${i++}` }); // UPDATE 1
		await msleep(1); const item2 = await makeTestItem(itemModel); // CREATE 2
		await msleep(1); await itemModel.save({ id: item2.id, name: `test_mod${i++}` }); // UPDATE 2
		await msleep(1); await itemModel.delete(item1.id); // DELETE 1
		await msleep(1); await itemModel.save({ id: item2.id, name: `test_mod${i++}` }); // UPDATE 2
		await msleep(1); const item3 = await makeTestItem(itemModel); // CREATE 3

		{
			const changes = (await changeModel.allForUser()).items;
			expect(changes.length).toBe(2);
			expect(changes[0].item_id).toBe(item2.id);
			expect(changes[0].type).toBe(ChangeType.Create);
			expect(changes[1].item_id).toBe(item3.id);
			expect(changes[1].type).toBe(ChangeType.Create);
		}

		{
			const pagination: ChangePagination = { limit: 5 };

			// In this page, the "create" change for item1 will not appear
			// because this item has been deleted. The "delete" change will
			// however appear in the second page.
			const page1 = (await changeModel.allForUser(pagination));
			let changes = page1.items;
			expect(changes.length).toBe(1);
			expect(page1.has_more).toBe(true);
			expect(changes[0].item_id).toBe(item2.id);
			expect(changes[0].type).toBe(ChangeType.Create);

			const page2 = (await changeModel.allForUser({ ...pagination, cursor: page1.cursor }));
			changes = page2.items;
			expect(changes.length).toBe(3);
			expect(page2.has_more).toBe(false);
			expect(changes[0].item_id).toBe(item1.id);
			expect(changes[0].type).toBe(ChangeType.Delete);
			expect(changes[1].item_id).toBe(item2.id);
			expect(changes[1].type).toBe(ChangeType.Update);
			expect(changes[2].item_id).toBe(item3.id);
			expect(changes[2].type).toBe(ChangeType.Create);
		}
	});

	test('should throw an error if cursor is invalid', async function() {
		const { user } = await createUserAndSession(1, true);
		const itemModel = models().item({ userId: user.id });
		const changeModel = models().change({ userId: user.id });

		let i = 1;
		await msleep(1); const item1 = await makeTestItem(itemModel); // CREATE 1
		await msleep(1); await itemModel.save({ id: item1.id, name: `test_mod${i++}` }); // UPDATE 1

		await expectThrow(async () => changeModel.allForUser({ limit: 1, cursor: 'invalid' }), 'resyncRequired');
	});

});
