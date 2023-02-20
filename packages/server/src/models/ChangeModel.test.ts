import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, expectThrow, createFolder, createItemTree3, expectNotThrow, createNote, updateNote } from '../utils/testing/testUtils';
import { ChangeType } from '../services/database/types';
import { Day, msleep } from '../utils/time';
import { ChangePagination } from './ChangeModel';
import { SqliteMaxVariableNum } from '../db';

describe('ChangeModel', () => {

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
		const changeModel = models().change();

		const item1 = await createFolder(session.id, { title: 'folder' });

		{
			const changes = (await changeModel.delta(user.id)).items;
			expect(changes.length).toBe(1);
			expect(changes[0].item_id).toBe(item1.id);
			expect(changes[0].type).toBe(ChangeType.Create);
		}
	});

	test('should track changes - create, then update', async () => {
		const { user } = await createUserAndSession(1, true);
		const itemModel = models().item();
		const changeModel = models().change();

		await msleep(1); const item1 = await models().item().makeTestItem(user.id, 1); // [1] CREATE 1
		await msleep(1); await itemModel.saveForUser(user.id, { id: item1.id, name: '0000000000000000000000000000001A.md', content: Buffer.from('') }); // [2] UPDATE 1a
		await msleep(1); await itemModel.saveForUser(user.id, { id: item1.id, name: '0000000000000000000000000000001B.md', content: Buffer.from('') }); // [3] UPDATE 1b
		await msleep(1); const item2 = await models().item().makeTestItem(user.id, 2); // [4] CREATE 2
		await msleep(1); await itemModel.saveForUser(user.id, { id: item2.id, name: '0000000000000000000000000000002A.md', content: Buffer.from('') }); // [5] UPDATE 2a
		await msleep(1); await itemModel.delete(item1.id); // [6] DELETE 1
		await msleep(1); await itemModel.saveForUser(user.id, { id: item2.id, name: '0000000000000000000000000000002B.md', content: Buffer.from('') }); // [7] UPDATE 2b
		await msleep(1); const item3 = await models().item().makeTestItem(user.id, 3); // [8] CREATE 3

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

	test('should throw an error if cursor is invalid', async () => {
		const { user } = await createUserAndSession(1, true);
		const itemModel = models().item();
		const changeModel = models().change();

		let i = 1;
		await msleep(1); const item1 = await models().item().makeTestItem(user.id, 1); // CREATE 1
		await msleep(1); await itemModel.saveForUser(user.id, { id: item1.id, name: `test_mod${i++}`, content: Buffer.from('') }); // UPDATE 1

		await expectThrow(async () => changeModel.delta(user.id, { limit: 1, cursor: 'invalid' }), 'resyncRequired');
	});

	test('should tell that there are more changes even when current page is empty', async () => {
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

	test('should delete old changes', async () => {
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

		// Between T5 and T6, 90 days later - nothing should happen because
		// there's only one note 2 change that is older than 90 days at this
		// point.
		jest.setSystemTime(new Date(t5 + changeTtl).getTime());
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

});
