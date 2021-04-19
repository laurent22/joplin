import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, expectThrow, createItem } from '../utils/testing/testUtils';
import { ChangeType, Item, Uuid } from '../db';
import { msleep } from '../utils/time';
import { ChangePagination } from './ChangeModel';

let itemCounter_ = 0;
async function makeTestItem(userId: Uuid): Promise<Item> {
	itemCounter_++;
	return models().item().saveForUser(userId, {
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
		const changeModel = models().change();

		const item1 = await createItem(session.id, 'test.txt', 'testing');

		{
			const changes = (await changeModel.allForUser(user.id)).items;
			expect(changes.length).toBe(1);
			expect(changes[0].item_id).toBe(item1.id);
			expect(changes[0].type).toBe(ChangeType.Create);
		}
	});

	test('should track changes - create, then update', async function() {
		const { user } = await createUserAndSession(1, true);
		const itemModel = models().item();
		const changeModel = models().change();

		await msleep(1); const item1 = await makeTestItem(user.id); // CREATE 1
		await msleep(1); await itemModel.save({ id: item1.id, name: 'test_mod_1a' }); // UPDATE 1a
		await msleep(1); await itemModel.save({ id: item1.id, name: 'test_mod_1b' }); // UPDATE 1b
		await msleep(1); const item2 = await makeTestItem(user.id); // CREATE 2
		await msleep(1); await itemModel.save({ id: item2.id, name: 'test_mod_2a' }); // UPDATE 2a
		await msleep(1); await itemModel.delete(item1.id); // DELETE 1
		await msleep(1); await itemModel.save({ id: item2.id, name: 'test_mod_2b' }); // UPDATE 2b
		await msleep(1); const item3 = await makeTestItem(user.id); // CREATE 3

		{
			// When we get all the changes, we get a CREATE event for item 2 and
			// item 3, and a DELETE event for item 1. We don't get a CREATE
			// event for item 1 because the associated item as well as user_item
			// objects have been deleted, so it's not possible to match it to
			// the userId. The DELETE event however has a userId associated with
			// it, so we get it back. On the client side, since item 1 won't be
			// present, this DELETE event simply means a no-op.
			const changes = (await changeModel.allForUser(user.id)).items;
			expect(changes.length).toBe(3);
			expect(changes[0].item_id).toBe(item2.id);
			expect(changes[0].type).toBe(ChangeType.Create);
			expect(changes[1].item_id).toBe(item1.id);
			expect(changes[1].type).toBe(ChangeType.Delete);
			expect(changes[2].item_id).toBe(item3.id);
			expect(changes[2].type).toBe(ChangeType.Create);
		}

		{
			const pagination: ChangePagination = { limit: 2 };

			// In the first page, CREATE 1, UPDATE 1a and UPDATE 1b will not
			// appear because the Item and UserItem objects have been deleted.
			//
			// So only CREATE 2 and UPDATE 2a are processed, and then
			// compressed down to just one CREATE event.
			const page1 = (await changeModel.allForUser(user.id, pagination));
			let changes = page1.items;
			expect(changes.length).toBe(1);
			expect(page1.has_more).toBe(true);
			expect(changes[0].item_id).toBe(item2.id);
			expect(changes[0].type).toBe(ChangeType.Create);

			// In the second page, we get DELETE 1 and UPDATE 2b. Again for the
			// client DELETE 1 would be a no-op since they didn't get the item.
			const page2 = (await changeModel.allForUser(user.id, { ...pagination, cursor: page1.cursor }));
			changes = page2.items;
			expect(changes.length).toBe(2);
			expect(page2.has_more).toBe(true);
			expect(changes[0].item_id).toBe(item1.id);
			expect(changes[0].type).toBe(ChangeType.Delete);
			expect(changes[1].item_id).toBe(item2.id);
			expect(changes[1].type).toBe(ChangeType.Update);

			// In the third page, we get the last event - CREATE 3
			const page3 = (await changeModel.allForUser(user.id, { ...pagination, cursor: page2.cursor }));
			changes = page3.items;
			expect(changes.length).toBe(1);
			expect(page3.has_more).toBe(false);
			expect(changes[0].item_id).toBe(item3.id);
			expect(changes[0].type).toBe(ChangeType.Create);
		}
	});

	test('should throw an error if cursor is invalid', async function() {
		const { user } = await createUserAndSession(1, true);
		const itemModel = models().item();
		const changeModel = models().change();

		let i = 1;
		await msleep(1); const item1 = await makeTestItem(user.id); // CREATE 1
		await msleep(1); await itemModel.save({ id: item1.id, name: `test_mod${i++}` }); // UPDATE 1

		await expectThrow(async () => changeModel.allForUser(user.id, { limit: 1, cursor: 'invalid' }), 'resyncRequired');
	});

});
