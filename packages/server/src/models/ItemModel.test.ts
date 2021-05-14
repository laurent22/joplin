import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, createItem, createItemTree, createResource, createNote, createFolder } from '../utils/testing/testUtils';
import { shareFolderWithUser } from '../utils/testing/shareApiUtils';
import { resourceBlobPath } from '../utils/joplinUtils';

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

	test('should find exclusively owned items 1', async function() {
		const { user: user1 } = await createUserAndSession(1, true);
		const { session: session2, user: user2 } = await createUserAndSession(2);

		const tree: any = {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		};

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
	});

	test('should find exclusively owned items 2', async function() {
		const { session: session1, user: user1 } = await createUserAndSession(1, true);
		const { session: session2, user: user2 } = await createUserAndSession(2);

		await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		await createFolder(session2.id, { id: '000000000000000000000000000000F2' });

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

	test('should find all items within a shared folder', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		const resourceItem1 = await createResource(session1.id, { id: '000000000000000000000000000000E1' }, 'testing1');
		const resourceItem2 = await createResource(session1.id, { id: '000000000000000000000000000000E2' }, 'testing2');

		const { share } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', [
			{
				id: '000000000000000000000000000000F1',
				children: [
					{
						id: '00000000000000000000000000000001',
						title: 'note test 1',
						body: `[testing 1](:/${resourceItem1.jop_id}) [testing 2](:/${resourceItem2.jop_id})`,
					},
					{
						id: '00000000000000000000000000000002',
						title: 'note test 2',
						body: '',
					},
				],
			},
			{
				id: '000000000000000000000000000000F2',
				children: [],
			},
		]);

		await createNote(session2.id, { id: '00000000000000000000000000000003', parent_id: '000000000000000000000000000000F1' });

		{
			const shareUserIds = await models().share().allShareUserIds(share);
			const children = await models().item().sharedFolderChildrenItems(shareUserIds, '000000000000000000000000000000F1');

			expect(children.filter(c => !!c.jop_id).map(c => c.jop_id).sort()).toEqual([
				'00000000000000000000000000000001',
				'00000000000000000000000000000002',
				'00000000000000000000000000000003',
				'000000000000000000000000000000E1',
				'000000000000000000000000000000E2',
			].sort());

			expect(children.filter(c => !c.jop_id).map(c => c.name).sort()).toEqual([
				resourceBlobPath('000000000000000000000000000000E1'),
				resourceBlobPath('000000000000000000000000000000E2'),
			].sort());
		}

		{
			const children = await models().item().sharedFolderChildrenItems([user1.id], '000000000000000000000000000000F2');
			expect(children.map(c => c.jop_id).sort()).toEqual([].sort());
		}
	});

});
