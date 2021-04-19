import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, createItem, createItemTree } from '../utils/testing/testUtils';
import { ShareType } from '../db';
import { shareWithUserAndAccept } from '../utils/testing/shareApiUtils';

describe('ItemModel', function() {

	beforeAll(async () => {
		await beforeAllDb('ItemModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should find exclusively owned items', async function() {
		const { session: session1, user: user1 } = await createUserAndSession(1, true);
		const { session: session2, user: user2 } = await createUserAndSession(2);

		const tree: any = {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		};

		const itemModel1 = models().item();

		await createItemTree(user1.id, '', tree);
		await createItem(session2.id, 'root:/test.txt:', 'testing');

		{
			const itemIds = await models().item().exclusivelyOwnedItemIds(user1.id);
			expect(itemIds.length).toBe(2);

			const item1 = await models().item().load(itemIds[0]);
			const item2 = await models().item().load(itemIds[1]);

			expect([item1.jop_id, item2.jop_id].sort()).toEqual(['000000000000000000000000000000F1', '00000000000000000000000000000001'].sort());
		}

		{
			const itemIds = await models().item().exclusivelyOwnedItemIds(user2.id);
			expect(itemIds.length).toBe(1);
		}

		const folderItem = await itemModel1.loadByJopId(user1.id, '000000000000000000000000000000F1');
		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem);

		{
			const itemIds = await models().item().exclusivelyOwnedItemIds(user1.id);
			expect(itemIds.length).toBe(0);
		}

		{
			const itemIds = await models().item().exclusivelyOwnedItemIds(user2.id);
			expect(itemIds.length).toBe(1);
		}

		await models().user().delete(user2.id);

		{
			const itemIds = await models().item().exclusivelyOwnedItemIds(user1.id);
			expect(itemIds.length).toBe(2);
		}
	});

});
