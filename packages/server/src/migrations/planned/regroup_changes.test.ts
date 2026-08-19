import config from '../../config';
import { truncateTables } from '../../db';
import ChangeModelOld from '../../models/ChangeModel/ChangeModel.old';
import ChangeModelNew from '../../models/ChangeModel/ChangeModel.new';
import { ChangeType, ItemType } from '../../services/database/types';
import { shareFolderWithUser } from '../../utils/testing/shareApiUtils';
import { afterAllTests, beforeAllDb, beforeEachDb, createUserAndSession, db, dbSlave, models } from '../../utils/testing/testUtils';
import { down, up } from './regroup_changes';
import { up as splitChangesMigrationUp, down as splitChangesMigrationDown } from '../20260310123600_split_changes';
import { uuidgen } from '../../utils/uuid';

// Note: The tests in this file use SQL queries on db() directly.
// This is needed because, when this test was first written, regroup_changes was a planned migration
// and no ChangeModel existed for changes_3.

const oldChangeModel = () => new ChangeModelOld(db(), dbSlave(), models, config());
const newChangeModel = () => new ChangeModelNew(db(), dbSlave(), models, config());

const setUpShareWithItem = async () => {
	const { session: session1 } = await createUserAndSession(1);
	const { session: session2 } = await createUserAndSession(2);

	const folderId = '000000000000000000000000000000F1';
	const { share } = await shareFolderWithUser(session1.id, session2.id, folderId, {
		[folderId]: {
			'00000000000000000000000000000001': null,
		},
	});

	const recordTestChange = (newChange: boolean, type: ChangeType) => {
		const changeData = {
			itemId: folderId,
			itemName: 'test.md',
			itemType: ItemType.Item,
			previousItem: { jop_share_id: share.id },
			shareId: share.id,
			sourceUserId: session1.user_id,
			type,
		};

		if (newChange) {
			return models().change().recordChange(changeData);
		} else {
			return oldChangeModel().recordChange(changeData);
		}
	};

	return { recordTestChange, session1, session2 };
};

const switchToChanges2 = async () => {
	// Run the "split changes" migration to ensure that the changes_2 table
	// table starts counting just after the changes in the legacy changes table:
	await splitChangesMigrationDown(db());
	await splitChangesMigrationUp(db());
};

const getMigratedChanges = () => db()('changes_3').select('*').orderBy('counter', 'asc');

describe('regroup_changes', () => {

	beforeAll(async () => {
		await beforeAllDb('regroup_changes');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	afterEach(async () => {
		// changes_3 isn't included in the tables truncated by truncateTables
		// and may be created by individual tests.
		if (await db().schema.hasTable('changes_3')) {
			await db().schema.dropTable('changes_3');
		}
	});

	it('should combine entries from changes and changes_2', async () => {
		const { recordTestChange } = await setUpShareWithItem();

		await truncateTables(db(), ['changes', 'changes_2']);

		await recordTestChange(false, ChangeType.Create);
		await recordTestChange(false, ChangeType.Update);

		await switchToChanges2();

		// This adds two updates: Calling recordChange for the new model
		// creates one update per user.
		await recordTestChange(true, ChangeType.Update);
		await recordTestChange(true, ChangeType.Delete);

		const expectedLegacyChanges = [
			{ type: ChangeType.Create },
			{ type: ChangeType.Update },
		];
		expect(await oldChangeModel().all()).toMatchObject(expectedLegacyChanges);

		const expectedNewChanges = [
			// Sentinel value marking the split between changes and changes_2.
			// (This is an artifact of the changes/changes_2 split).
			{ type: ChangeType.Create, item_name: '' },

			{ type: ChangeType.Update },
			{ type: ChangeType.Update },
			{ type: ChangeType.Delete },
		];
		expect(await newChangeModel().all()).toMatchObject(expectedNewChanges);

		await up(db());

		const migratedChanges = await getMigratedChanges();

		expect(migratedChanges).toMatchObject([
			// Should migrate all legacy changes except updates
			...expectedLegacyChanges.filter(
				change => change.type !== ChangeType.Update,
			),
			// Should migrate all new changes
			...expectedNewChanges,
		]);
	});

	it('should migrate down', async () => {
		const { recordTestChange } = await setUpShareWithItem();

		await truncateTables(db(), ['changes', 'changes_2']);

		await recordTestChange(false, ChangeType.Create);
		await recordTestChange(false, ChangeType.Update);

		await switchToChanges2();

		await recordTestChange(true, ChangeType.Update);
		await recordTestChange(true, ChangeType.Delete);

		const newChanges = await models().change().all();

		await up(db());

		// Delete the last change in changes_2, to simulate a new change added to
		// changes_3 after the migration was completed:
		await models().change().delete(newChanges[newChanges.length - 1].id);
		await down(db());
		expect(await models().change().all()).toEqual(newChanges);
	});

	// For the migration to be successful, it's important that changes_3 and changes_2 have the same columns in the same
	// order.
	it('should create changes_3 with the same columns as changes_2', async () => {
		const { recordTestChange } = await setUpShareWithItem();

		await switchToChanges2();
		await recordTestChange(true, ChangeType.Update);
		await up(db());

		const lastChangeFrom = async (tableName: string) => {
			return await db()(tableName)
				.select('*')
				.orderBy('counter', 'desc')
				.first();
		};
		const originalUpdate = await lastChangeFrom('changes_2');
		const migratedUpdate = await lastChangeFrom('changes_3');

		expect(originalUpdate).toEqual(migratedUpdate);
	});

	it('should autoincrement "counter" in changes_3, starting from the last counter in changes_2', async () => {
		await switchToChanges2();
		await up(db());

		const addTestChange = (itemId: string) => {
			return db()('changes_3').insert({
				id: uuidgen(),
				item_id: itemId,
				user_id: uuidgen(),
				item_name: 'test',
				item_type: 1,
				type: 1,
				updated_time: Date.now(),
				created_time: Date.now(),
			});
		};

		await addTestChange('A0000000000000000000000000000001');
		await addTestChange('A0000000000000000000000000000002');
		const allMigratedChanges = await db()('changes_3')
			.select('*')
			.orderBy('counter', 'asc');

		expect(allMigratedChanges).toMatchObject([
			{ counter: 1 }, // changes/changes_2 separator
			{ counter: 2, item_id: 'A0000000000000000000000000000001' },
			{ counter: 3, item_id: 'A0000000000000000000000000000002' },
		]);
	});

	it('should migrate more changes when up is run multiple times', async () => {
		const { recordTestChange } = await setUpShareWithItem();
		await truncateTables(db(), ['changes', 'changes_2']);

		await switchToChanges2();
		await recordTestChange(true, ChangeType.Update);
		// The migrated changes should contain:
		// - One change to mark the start of changes_2
		// - 2 update changes (one per user).
		await up(db());
		expect(await getMigratedChanges()).toHaveLength(3);

		await recordTestChange(true, ChangeType.Update);
		await recordTestChange(true, ChangeType.Update);

		// The four new update changes should migrate
		await up(db());
		expect(await getMigratedChanges()).toHaveLength(7);

		// The new delete change should migrate
		await recordTestChange(true, ChangeType.Delete);
		await up(db());
		expect(await getMigratedChanges()).toHaveLength(8);
	});
});
