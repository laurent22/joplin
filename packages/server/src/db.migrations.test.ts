import { afterAllTests, beforeAllDb, beforeEachDb, db } from './utils/testing/testUtils';
import sqlts from '@rmp135/sql-ts';
import { DbConnection, migrateDown, migrateLatest, migrateUp, needsMigration, nextMigration } from './db';

async function dbSchemaSnapshot(db: DbConnection): Promise<Awaited<ReturnType<typeof sqlts.toTypeScript>>> {
	return sqlts.toTypeScript({}, db as unknown as Parameters<typeof sqlts.toTypeScript>[1]);
}

describe('db.migrations', () => {

	let testIndex = 0;
	beforeEach(async () => {
		// Use `beforeAllDb` in `beforeEach` to ensure each test has its own database.
		// To work around file locking issues on Windows, each test needs its own database instance:
		const databaseKey = `db.migrations.${testIndex ++}`;
		await beforeAllDb(databaseKey, { autoMigrate: false });
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
			'20250219183745_changes_optimization',
			'20251107113000_fix_delta_performance',
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

	it('should recover from a stuck migration lock', async () => {
		// Run one migration so that knex_migrations_lock exists.
		await migrateUp(db());

		// Simulate a server that crashed mid-migration: the lock row was set to
		// is_locked=1 and never released. Without auto-unlock, the next migration
		// call would hang forever waiting on the lock.
		await db()('knex_migrations_lock').update({ is_locked: 1 });
		expect((await db()('knex_migrations_lock').first()).is_locked).toBe(1);

		await migrateLatest(db());

		expect(await needsMigration(db())).toBe(false);
		expect((await db()('knex_migrations_lock').first()).is_locked).toBe(0);
	});

});
