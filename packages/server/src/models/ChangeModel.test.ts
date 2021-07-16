import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, expectThrow, createFolder, createItemTree3 } from '../utils/testing/testUtils';
import { ChangeType, Item, Uuid } from '../db';
import { msleep } from '../utils/time';
import { ChangePagination } from './ChangeModel';

async function makeTestItem(userId: Uuid, num: number): Promise<Item> {
	return models().item().saveForUser(userId, {
		name: `0000000000000000000000000000000${num}.md`,
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

	test('should track changes - create only', async function() {
		const { session, user } = await createUserAndSession(1, true);
		const changeModel = models().change();

		const item1 = await createFolder(session.id, { title: 'folder' });

		{
			const changes = (await changeModel.delta(user.id)).items;
			expect(changes.length).toBe(1);
			expect(changes[0].item_id).toBe(item1.id);
			expect(changes[0].type).toBe(ChangeType.Create);
		}
	});

	test('should track changes - create, then update', async function() {
		const { user } = await createUserAndSession(1, true);
		const itemModel = models().item();
		const changeModel = models().change();

		await msleep(1); const item1 = await makeTestItem(user.id, 1); // [1] CREATE 1
		await msleep(1); await itemModel.saveForUser(user.id, { id: item1.id, name: '0000000000000000000000000000001A.md' }); // [2] UPDATE 1a
		await msleep(1); await itemModel.saveForUser(user.id, { id: item1.id, name: '0000000000000000000000000000001B.md' }); // [3] UPDATE 1b
		await msleep(1); const item2 = await makeTestItem(user.id, 2); // [4] CREATE 2
		await msleep(1); await itemModel.saveForUser(user.id, { id: item2.id, name: '0000000000000000000000000000002A.md' }); // [5] UPDATE 2a
		await msleep(1); await itemModel.delete(item1.id); // [6] DELETE 1
		await msleep(1); await itemModel.saveForUser(user.id, { id: item2.id, name: '0000000000000000000000000000002B.md' }); // [7] UPDATE 2b
		await msleep(1); const item3 = await makeTestItem(user.id, 3); // [8] CREATE 3

		// Check that the 8 changes were created
		const allUncompressedChanges = await changeModel.all();
		expect(allUncompressedChanges.length).toBe(8);

		{
			// When we get all the changes, we only get CREATE 2 and CREATE 3.
			// We don't get CREATE 1 because item 1 has been deleted. And we
			// also don't get any UPDATE event since they've been compressed
			// down to the CREATE events.
			const changes = (await changeModel.delta(user.id)).items;
			expect(changes.length).toBe(2);
			expect(changes[0].item_id).toBe(item2.id);
			expect(changes[0].type).toBe(ChangeType.Create);
			expect(changes[1].item_id).toBe(item3.id);
			expect(changes[1].type).toBe(ChangeType.Create);
		}

		{
			const pagination: ChangePagination = { limit: 3 };

			// Internally, when we request the first three changes, we get back:
			//
			// - CREATE 1
			// - CREATE 2
			// - UPDATE 2a
			//
			// We don't get back UPDATE 1a and 1b because the associated item
			// has been deleted.
			//
			// Unlike CREATE events, which come from "user_items" and are
			// associated with a user, UPDATE events comes from "items" and are
			// not associated with any specific user. Only if the user has a
			// corresponding user_item do they get UPDATE events. But in this
			// case, since the item has been deleted, there's no longer
			// "user_items" objects.
			//
			// Then CREATE 1 is removed since item 1 has been deleted and UPDATE
			// 2a is compressed down to CREATE 2.
			const page1 = (await changeModel.delta(user.id, pagination));
			let changes = page1.items;
			expect(changes.length).toBe(1);
			expect(page1.has_more).toBe(true);
			expect(changes[0].item_id).toBe(item2.id);
			expect(changes[0].type).toBe(ChangeType.Create);

			// In the second page, we get all the expected events since nothing
			// has been compressed.
			const page2 = (await changeModel.delta(user.id, { ...pagination, cursor: page1.cursor }));
			changes = page2.items;
			expect(changes.length).toBe(3);
			// Although there are no more changes, it's not possible to know
			// that without running the next query
			expect(page2.has_more).toBe(true);
			expect(changes[0].item_id).toBe(item1.id);
			expect(changes[0].type).toBe(ChangeType.Delete);
			expect(changes[1].item_id).toBe(item2.id);
			expect(changes[1].type).toBe(ChangeType.Update);
			expect(changes[2].item_id).toBe(item3.id);
			expect(changes[2].type).toBe(ChangeType.Create);

			// Check that we indeed reached the end of the feed.
			const page3 = (await changeModel.delta(user.id, { ...pagination, cursor: page2.cursor }));
			expect(page3.items.length).toBe(0);
			expect(page3.has_more).toBe(false);
		}
	});

	test('should throw an error if cursor is invalid', async function() {
		const { user } = await createUserAndSession(1, true);
		const itemModel = models().item();
		const changeModel = models().change();

		let i = 1;
		await msleep(1); const item1 = await makeTestItem(user.id, 1); // CREATE 1
		await msleep(1); await itemModel.saveForUser(user.id, { id: item1.id, name: `test_mod${i++}` }); // UPDATE 1

		await expectThrow(async () => changeModel.delta(user.id, { limit: 1, cursor: 'invalid' }), 'resyncRequired');
	});

	test('should tell that there are more changes even when current page is empty', async function() {
		const { user: user1 } = await createUserAndSession(1);

		const changeCount = 10;

		const itemsToCreate: any[] = [];
		for (let i = 0; i < changeCount / 2; i++) {
			itemsToCreate.push({
				id: (`${i}`).padStart(32, '0'),
				children: [],
			});
		}

		await createItemTree3(user1.id, '', '', itemsToCreate);
		await models().item().deleteAll(user1.id);

		expect((await models().change().all()).length).toBe(changeCount);

		// Since all items have been deleted, the first change page is empty.
		// However the "hasMore" property should be true to tell caller that
		// they should fetch more changes.
		const allFromIds1 = await models().change().allFromId('', changeCount / 2);
		expect(allFromIds1.items.length).toBe(0);
		expect(allFromIds1.has_more).toBe(true);

		const allFromIds2 = await models().change().allFromId(allFromIds1.cursor, changeCount / 2);
		expect(allFromIds2.items.length).toBe(5);
		expect(allFromIds2.has_more).toBe(true);

		const allFromIds3 = await models().change().allFromId(allFromIds2.cursor, changeCount / 2);
		expect(allFromIds3.items.length).toBe(0);
		expect(allFromIds3.has_more).toBe(false);
	});

});
