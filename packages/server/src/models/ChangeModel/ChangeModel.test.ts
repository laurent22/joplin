import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, expectThrow, createFolder, createItemTree3, expectNotThrow, createNote, updateNote, db, dbSlave, createItemTree } from '../../utils/testing/testUtils';
import { ChangeType, Item, Session, ShareType, User } from '../../services/database/types';
import { Day, msleep } from '../../utils/time';
import { ChangePagination } from './ChangeModel';
import { SqliteMaxVariableNum, truncateTables } from '../../db';
import { defaultDeltaPagination } from './ChangeModel';
import ChangeModelOld from './ChangeModel.old';
import config from '../../config';
import { runWithFakeTimers } from '@joplin/lib/testing/test-utils';
import { shareWithUserAndAccept } from '../../utils/testing/shareApiUtils';
import { NoteEntity } from '@joplin/lib/services/database/types';

const oldChangeModel = () => {
	return new ChangeModelOld(
		db(), dbSlave(), models, config(),
	);
};

const recordLegacyChange = (user: User, item: Item, type: ChangeType) => {
	return oldChangeModel().recordChange({
		itemId: item.id,
		itemName: item.name,
		itemType: item.jop_type,
		previousItem: { jop_share_id: item.jop_share_id },
		sourceUserId: user.id,
		shareId: item.jop_share_id,
		type,
	});
};

const clearChanges = () => {
	return truncateTables(db(), ['changes', 'changes_2']);
};

describe('ChangeModel/index', () => {

	beforeAll(async () => {
		await beforeAllDb('ChangeModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should track changes - create only', async () => {
		const { session, user } = await createUserAndSession(1, true);

		const item1 = await createFolder(session.id, { title: 'folder' });

		{
			const changes = (await models().change().delta(user.id)).items;
			expect(changes.length).toBe(1);
			expect(changes[0].item_id).toBe(item1.id);
			expect(changes[0].type).toBe(ChangeType.Create);
		}
	});

	test('should track changes - create, then update', async () => {
		const { user } = await createUserAndSession(1, true);
		const itemModel = models().item();

		await msleep(1); const item1 = await models().item().makeTestItem(user.id, 1); // [1] CREATE 1
		await msleep(1); await itemModel.saveForUser(user.id, { id: item1.id, name: '0000000000000000000000000000001A.md', content: Buffer.from('') }); // [2] UPDATE 1a
		await msleep(1); await itemModel.saveForUser(user.id, { id: item1.id, name: '0000000000000000000000000000001B.md', content: Buffer.from('') }); // [3] UPDATE 1b
		await msleep(1); const item2 = await models().item().makeTestItem(user.id, 2); // [4] CREATE 2
		await msleep(1); await itemModel.saveForUser(user.id, { id: item2.id, name: '0000000000000000000000000000002A.md', content: Buffer.from('') }); // [5] UPDATE 2a
		await msleep(1); await itemModel.delete(item1.id); // [6] DELETE 1
		await msleep(1); await itemModel.saveForUser(user.id, { id: item2.id, name: '0000000000000000000000000000002B.md', content: Buffer.from('') }); // [7] UPDATE 2b
		await msleep(1); const item3 = await models().item().makeTestItem(user.id, 3); // [8] CREATE 3

		// Check that the 8 changes were created
		const allUncompressedChanges = await models().change().all();
		expect(allUncompressedChanges.length).toBe(8);

		{
			// When we get all the changes, we get CREATE 2, DELETE 1, and CREATE 3:
			// - We don't get CREATE 1 since CREATE 1 -> DELETE 1 was compressed to
			//   DELETE 1.
			// - We don't get any UPDATE event since they've been compressed
			//   down to the CREATE events.
			const changes = (await models().change().delta(user.id)).items;
			expect(changes.length).toBe(3);
			expect(changes[0].item_id).toBe(item2.id);
			expect(changes[0].type).toBe(ChangeType.Create);
			expect(changes[1].item_id).toBe(item1.id);
			expect(changes[1].type).toBe(ChangeType.Delete);
			expect(changes[2].item_id).toBe(item3.id);
			expect(changes[2].type).toBe(ChangeType.Create);
		}

		{
			const pagination: ChangePagination = { limit: 5 };

			// Internally, when we request the first three changes, we get back:
			//
			// - CREATE 1
			// - UPDATE 1
			// - UPDATE 1
			// - CREATE 2
			// - UPDATE 2a
			//
			// We don't get back UPDATE 1a and 1b because the associated item
			// has been deleted.
			//
			// Then CREATE 1 is removed since item 1 has been deleted and UPDATE
			// 2a is compressed down to CREATE 2.
			const page1 = (await models().change().delta(user.id, pagination));
			let changes = page1.items;
			expect(changes.length).toBe(1);
			expect(page1.has_more).toBe(true);
			expect(changes[0].item_id).toBe(item2.id);
			expect(changes[0].type).toBe(ChangeType.Create);

			// In the second page, we get all the expected events since nothing
			// has been compressed.
			const page2 = (await models().change().delta(user.id, { ...pagination, cursor: page1.cursor }));
			changes = page2.items;
			expect(changes.length).toBe(3);
			expect(changes[0].item_id).toBe(item1.id);
			expect(changes[0].type).toBe(ChangeType.Delete);
			expect(changes[1].item_id).toBe(item2.id);
			expect(changes[1].type).toBe(ChangeType.Update);
			expect(changes[2].item_id).toBe(item3.id);
			expect(changes[2].type).toBe(ChangeType.Create);

			// There should be no more changes
			expect(page2.has_more).toBe(false);

			// Check that we indeed reached the end of the feed.
			const page3 = (await models().change().delta(user.id, { ...pagination, cursor: page2.cursor }));
			expect(page3.items.length).toBe(0);
			expect(page3.has_more).toBe(false);
		}
	});

	test('should throw an error if cursor is invalid', async () => {
		const { user } = await createUserAndSession(1, true);
		const itemModel = models().item();

		let i = 1;
		await msleep(1); const item1 = await models().item().makeTestItem(user.id, 1); // CREATE 1
		await msleep(1); await itemModel.saveForUser(user.id, { id: item1.id, name: `test_mod${i++}`, content: Buffer.from('') }); // UPDATE 1

		await expectThrow(async () => models().change().delta(user.id, { limit: 1, cursor: 'invalid' }), 'resyncRequired');
	});

	test('should tell that there are more changes even when current page is empty', async () => {
		const { user: user1 } = await createUserAndSession(1);

		const changeCount = 10;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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

	test('should not fail when retrieving many changes', async () => {
		// Create many changes and verify that, by default, the SQL query that
		// returns change doesn't fail. Before the max number of items was set
		// to 1000 and it would fail with "SQLITE_ERROR: too many SQL variables"
		// with SQLite. So now it's set to 999.

		const { user } = await createUserAndSession(1, true);

		await models().item().makeTestItems(user.id, 1010);

		let changeCount = 0;
		await expectNotThrow(async () => {
			const changes = await models().change().allFromId('');
			changeCount = changes.items.length;
		});

		expect(changeCount).toBe(SqliteMaxVariableNum);
	});

	test('should tell if there are more changes', async () => {
		const { user } = await createUserAndSession(1, true);
		await models().item().makeTestItems(user.id, 500);

		const result = await models().change().delta(user.id, { limit: 100 });
		expect(result.has_more).toBe(true);
	});

	test('should retrieve changes that span the old and new tables', async () => {
		const { user } = await createUserAndSession(1, true);

		await msleep(1);
		const { id: itemId } = await models().item().makeTestItem(user.id, 1); // [1] CREATE 1
		const item = await models().item().load(itemId);
		await msleep(1);
		await models().item().saveForUser(user.id, { id: item.id, name: '0000000000000000000000000000001A.md', content: Buffer.from('') });

		// Clear all changes
		await models().change().delete((await models().change().all()).map(change => change.id));

		let changes = await models().change().allFromId('');
		expect(changes.items).toHaveLength(0);

		// Create changes in the old table
		await recordLegacyChange(user, item, ChangeType.Create);
		await recordLegacyChange(user, item, ChangeType.Update);
		await recordLegacyChange(user, item, ChangeType.Update);

		// Create changes in the new table
		await msleep(1);
		await models().item().saveForUser(user.id, { id: item.id, name: '0000000000000000000000000000001A.md', content: Buffer.from('') });

		// allFromId should query from both tables:
		changes = await models().change().allFromId('');
		expect(changes.items).toHaveLength(4);
		changes = await models().change().allFromId(changes.cursor);
		expect(changes.items).toHaveLength(0);

		// delta should query from both tables
		changes = await models().change().delta(user.id);
		// Change compression results in 1 change initially, since the creates and
		// updates are compressed:
		expect(changes.items).toHaveLength(1);

		// Adding a new item with a different ID should add a new item to the delta results
		await models().item().makeTestItem(user.id, 1);
		changes = await models().change().delta(user.id);
		expect(changes.items).toHaveLength(2);
	});

	test('should delete old changes in the legacy changes table', () => runWithFakeTimers(async () => {
		const { session, user } = await createUserAndSession(1);
		const note1 = await createNote(session.id, {});
		await clearChanges();

		const t1 = new Date('2020-01-01').getTime();
		jest.setSystemTime(t1);

		await recordLegacyChange(user, note1, ChangeType.Create);

		jest.setSystemTime(t1 + Day * 10);
		await recordLegacyChange(user, note1, ChangeType.Update);

		jest.setSystemTime(t1 + Day * 20);
		await recordLegacyChange(user, note1, ChangeType.Update);

		jest.setSystemTime(t1 + Day * 300);

		// Compressing old changes should remove the second-to-last update:
		expect(await models().change().all()).toMatchObject([
			{ type: ChangeType.Create },
			{ type: ChangeType.Update },
			{ type: ChangeType.Update },
		]);
		await models().change().compressOldChanges();
		expect(await models().change().all()).toMatchObject([
			{ type: ChangeType.Create },
			{ type: ChangeType.Update },
		]);
	}));

	test('should delete old changes in the new changes table', async () => {
		// Create the following events:
		//
		// T1   2020-01-01    U1 Create
		// T2   2020-01-10    U1 Update    U2 Create
		// T3   2020-01-20    U1 Update
		// T4   2020-01-30    U1 Update
		// T5   2020-02-10                 U2 Update
		// T6   2020-02-20                 U2 Update
		//
		// Use this to add days to a date:
		//
		// https://www.timeanddate.com/date/dateadd.html

		const changeTtl = (180 + 1) * Day;

		const { session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		jest.useFakeTimers();

		const t1 = new Date('2020-01-01').getTime();
		jest.setSystemTime(t1);
		const note1 = await createNote(session1.id, {});

		const t2 = new Date('2020-01-10').getTime();
		jest.setSystemTime(t2);
		const note2 = await createNote(session2.id, {});
		await updateNote(session1.id, { id: note1.jop_id });

		const t3 = new Date('2020-01-20').getTime();
		jest.setSystemTime(t3);
		await updateNote(session1.id, { id: note1.jop_id });

		const t4 = new Date('2020-01-30').getTime();
		jest.setSystemTime(t4);
		await updateNote(session1.id, { id: note1.jop_id });

		const t5 = new Date('2020-02-10').getTime();
		jest.setSystemTime(t5);
		await updateNote(session2.id, { id: note2.jop_id });

		const t6 = new Date('2020-02-20').getTime();
		jest.setSystemTime(t6);
		await updateNote(session2.id, { id: note2.jop_id });

		expect(await models().change().count()).toBe(7);

		// Shouldn't do anything initially because it only deletes old changes.
		await models().change().compressOldChanges();
		expect(await models().change().count()).toBe(7);

		// 180 days after T4, it should delete all U1 updates events except for
		// the last one
		jest.setSystemTime(new Date(t4 + changeTtl).getTime());
		await models().change().compressOldChanges();
		expect(await models().change().count()).toBe(5);
		{
			const updateChange = (await models().change().all()).find(c => c.item_id === note1.id && c.type === ChangeType.Update);
			expect(updateChange.created_time >= t4 && updateChange.created_time < t5).toBe(true);
		}
		// None of the note 2 changes should have been deleted because they've
		// been made later
		expect((await models().change().all()).filter(c => c.item_id === note2.id).length).toBe(3);

		// Between T5 and T6, just under 90 days later - nothing should happen because
		// there's only one note 2 change that is older than 90 days at this
		// point.
		jest.setSystemTime(new Date(t5 + changeTtl - 4 * Day).getTime());
		await models().change().compressOldChanges();
		expect(await models().change().count()).toBe(5);

		// After T6, more than 90 days later - now the change at T5 should be
		// deleted, keeping only the change at T6.
		jest.setSystemTime(new Date(t6 + changeTtl).getTime());
		await models().change().compressOldChanges();
		expect(await models().change().count()).toBe(4);
		{
			const updateChange = (await models().change().all()).find(c => c.item_id === note2.id && c.type === ChangeType.Update);
			expect(updateChange.created_time >= t6).toBe(true);
		}

		jest.useRealTimers();
	});

	test('should preserve last updates for shared items when deleting old changes', () => runWithFakeTimers(async () => {
		// Create the following events:
		//
		// T1   2025-01-01    U1 Create    U2 Create
		// T2   2025-02-01    U1 Update    U2 Update
		// T3   2025-02-02    U2 Update    U2 Update

		const t1 = new Date('2025-01-01').getTime();
		jest.setSystemTime(t1);

		const { session: session1 } = await createUserAndSession(1);
		const { session: session2, user: user2 } = await createUserAndSession(2);

		await createItemTree(session1.user_id, '', {
			'000000000000000000000000000000F1': { },
		});
		const shareRoot = await models().item().loadByJopId(session1.user_id, '000000000000000000000000000000F1');
		const { share } = await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.Folder, shareRoot);

		const note = await createNote(session1.id, {
			title: 'test',
			share_id: share.id,
			is_shared: 1,
		});

		await models().share().updateSharedItems3();

		// One creation event for each item
		const changesForNote = async () => (await models().change().all()).filter(c => c.item_id === note.id);
		expect(await changesForNote()).toMatchObject([
			{ type: ChangeType.Create, user_id: session1.user_id },
			{ type: ChangeType.Create, user_id: session2.user_id },
		]);

		let updateCounter = 0;
		const updateAtTime = async (session: Session, timeString: string) => {
			const time = new Date(timeString).getTime();
			jest.setSystemTime(time);
			const joplinNote = await models().item().loadAsJoplinItem<NoteEntity>(note.id);
			await updateNote(session.id, {
				...joplinNote,
				title: `Updated (x${updateCounter++})`,
			});
			return { time };
		};

		// Each updateAtTime should create **two** update events (one per user)
		await updateAtTime(session1, '2025-02-01');
		const { time: lastUpdateTime } = await updateAtTime(session2, '2025-02-02');

		expect(await changesForNote()).toMatchObject([
			{ type: ChangeType.Create },
			{ type: ChangeType.Create },

			{ type: ChangeType.Update },
			{ type: ChangeType.Update },

			{ type: ChangeType.Update },
			{ type: ChangeType.Update },
		]);

		const t4 = new Date('2040-08-16').getTime();
		jest.setSystemTime(t4);

		await models().change().compressOldChanges();

		const compressedChanges = await changesForNote();
		expect(compressedChanges).toMatchObject([
			{ type: ChangeType.Create },
			{ type: ChangeType.Create },
			// One change should remain for each user
			{ type: ChangeType.Update, user_id: session2.user_id },
			{ type: ChangeType.Update, user_id: session1.user_id },
		]);

		// Remaining updates should be those that occurred just
		// after lastUpdateTime
		const update1 = compressedChanges[compressedChanges.length - 2];
		const update2 = compressedChanges[compressedChanges.length - 1];
		expect(update1.created_time).toBeGreaterThanOrEqual(lastUpdateTime);
		expect(update1.created_time).toBeLessThan(lastUpdateTime + Day);
		expect(update2.created_time).toBeGreaterThanOrEqual(lastUpdateTime);
		expect(update2.created_time).toBeLessThan(lastUpdateTime + Day);
	}));

	test('should not return the whole item', async () => {
		const { user } = await createUserAndSession(1, true);

		const changeModel = models().change();

		await createItemTree3(user.id, '', '', [
			{
				id: '000000000000000000000000000000F1',
				title: 'Folder 1',
			},
		]);

		const result = await changeModel.delta(user.id, defaultDeltaPagination());
		expect('jopItem' in result.items[0]).toBe(false);
	});

	test.each([
		{
			label: 'should replace create -> update with "create"',
			changes: [
				{ type: ChangeType.Create },
				{ type: ChangeType.Update },
			],
			expected: [
				{ type: ChangeType.Create },
			],
		},
		{
			label: 'should replace create -> delete with delete',
			// Create -> Delete can't be filtered out without un-deleting items.
			// This is because compressChanges is often called on an individual **page**
			// of results. For example, if the first page of results is,
			// - Create: Item 1
			// - ... other changes not involving item 1...
			//
			// And the second page of results is,
			// - Create: Item 1
			// - Delete Item 1
			//
			// Then removing the Create -> Delete would result in Item 1 ultimately being
			// created, rather than deleted, since there's still a "Create: Item 1" in the
			// first page.
			changes: [
				{ type: ChangeType.Create },
				{ type: ChangeType.Delete },
			],
			expected: [
				{ type: ChangeType.Delete },
			],
		},
		{
			label: 'should replace update -> delete with delete',
			changes: [
				{ type: ChangeType.Update },
				{ type: ChangeType.Delete },
			],
			expected: [
				{ type: ChangeType.Delete },
			],
		},
		{
			label: 'should replace update -> update with update',
			changes: [
				{ type: ChangeType.Update },
				{ type: ChangeType.Update },
			],
			expected: [
				{ type: ChangeType.Update },
			],
		},
		{
			label: 'should not compress updates that change the share ID',
			changes: [
				{ type: ChangeType.Update, previous_share_id: 'a' },
				{ type: ChangeType.Update, previous_share_id: 'b' },
			],
			expected: [
				{ type: ChangeType.Update, previous_share_id: 'a' },
				{ type: ChangeType.Update, previous_share_id: 'b' },
			],
		},
		{
			label: 'should keep the latest change when compressing updates',
			changes: [
				{ type: ChangeType.Update, item_id: '1', previous_share_id: 'a', counter: 1 },
				{ type: ChangeType.Update, item_id: '1', previous_share_id: 'b', counter: 2 },
				{ type: ChangeType.Update, item_id: '1', previous_share_id: 'b', counter: 3 },
				{ type: ChangeType.Update, item_id: '2', previous_share_id: 'a', counter: 4 },
				{ type: ChangeType.Update, item_id: '2', previous_share_id: 'a', counter: 5 },
			],
			expected: [
				{ type: ChangeType.Update, item_id: '1', previous_share_id: 'a', counter: 1 },
				{ type: ChangeType.Update, item_id: '1', previous_share_id: 'b', counter: 3 },
				{ type: ChangeType.Update, item_id: '2', previous_share_id: 'a', counter: 5 },
			],
		},
		{
			label: 'should not compress updates that change different items',
			changes: [
				{ type: ChangeType.Update, item_id: '1' },
				{ type: ChangeType.Update, item_id: '2' },
			],
			expected: [
				{ type: ChangeType.Update, item_id: '1' },
				{ type: ChangeType.Update, item_id: '2' },
			],
		},
	])('should compress changes: $label', ({ changes, expected }) => {
		// Fill default properties
		changes = changes.map((change, index) => ({
			counter: index,
			item_id: '1',
			...change,
		}));

		expect(models().change().compressChanges_(changes)).toMatchObject(expected);
	});

	test('changesForUserQuery should split totals across the old/new changes boundary', async () => {
		const { user, session } = await createUserAndSession(1, true);

		const note = await createNote(session.id, { id: 'A0000000000000000000000000000000' });
		await clearChanges(); // The first changes should be in the legacy changes table

		await recordLegacyChange(user, note, ChangeType.Create);
		await recordLegacyChange(user, note, ChangeType.Update);
		await recordLegacyChange(user, note, ChangeType.Update);

		await models().item().makeTestItems(user.id, 500);

		const doCountQuery = true;
		const counts = await models().change().changesForUserQuery(user.id, 0, 999, doCountQuery);
		expect(counts).toMatchObject([{ total: 3 }, { total: 500 }]);
	});
});

