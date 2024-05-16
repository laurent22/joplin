import { afterAllTests, beforeAllDb, beforeEachDb, db } from './utils/testing/testUtils';
import sqlts from '@rmp135/sql-ts';
import { DbConnection, migrateDown, migrateLatest, migrateUp, needsMigration, nextMigration } from './db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
async function dbSchemaSnapshot(db: DbConnection): Promise<any> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	return sqlts.toTypeScript({}, db as any);
}

describe('db.migrations', () => {

	beforeEach(async () => {
		await beforeAllDb('db.migrations', { autoMigrate: false });
		await beforeEachDb();
	});

	afterEach(async () => {
		await afterAllTests();
	});

	it('should allow upgrading and downgrading schema', async () => {
		// Migrations before that didn't have a down() step.
		const ignoreAllBefore = '20210819165350_user_flags';

		// Some migrations produce no changes visible to sql-ts, in particular
		// when the migration only adds a constraint or an index, or when a
		// default is changed. In this case we skip the migration. Ideally we
		// should test these too but for now that will do.
		const doNoCheckUpgrade = [
			'20211030103016_item_owner_name_unique',
			'20211111134329_storage_index',
			'20220121172409_email_recipient_default',
			'20240413141308_changes_optimization',
		];

		let startProcessing = false;

		while (true) {
			await migrateUp(db());

			if (!startProcessing) {
				const next = await nextMigration(db());
				if (next === ignoreAllBefore) {
					startProcessing = true;
				} else {
					continue;
				}
			}

			const next = await nextMigration(db());

			if (!next) break;

			const initialSchema = await dbSchemaSnapshot(db());

			await migrateUp(db());

			const afterUpgradeSchema = await dbSchemaSnapshot(db());

			if (!doNoCheckUpgrade.includes(next)) {
				expect(initialSchema, `Schema upgrade did not produce a new schema. In migration: ${next}`).not.toEqual(afterUpgradeSchema);
			}

			await migrateDown(db());

			const afterRollbackSchema = await dbSchemaSnapshot(db());

			expect(initialSchema, `Schema rollback did not produce previous schema. In migration: ${next}`).toEqual(afterRollbackSchema);
		}
	});

	it('should tell if a migration is required', async () => {
		expect(await needsMigration(db())).toBe(true);

		await migrateLatest(db());

		expect(await needsMigration(db())).toBe(false);
	});

});
