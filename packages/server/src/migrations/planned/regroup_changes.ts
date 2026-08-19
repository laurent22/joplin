import Logger from '@joplin/utils/Logger';
import { DbConnection, isPostgres } from '../../db';
import { Uuid } from '../../services/database/types';

const logger = Logger.create('regroup_changes');

// This migration creates a new `changes_3` table by combining `changes` and `changes_2`.
// This works by:
// - Copying all "Create"/"Delete" entries from `changes` and assigning them new IDs.
// - Copying all entries from `changes_2` as-is.
//
// Old change migration: IDs for all `changes` entries are changed. This is because "Update"
// changes from the legacy `changes` table aren't migrated. The ID changes will force all
// clients with a delta cursor pointing to an old change to do a full re-sync (similar logic
// to the old change cleanup entry removal).
//
// Plan:
// 1. Commit this as a draft migration as a part of the initial pull request.
// 2. 180 days later, enable the migration.
//   - This migration will may be slow for millions of changes. However, it should be safe
//     to run while running the server.
// 3. Migrate `ChangeModel.new.ts` to use `changes_3` instead of `changes` and remove `ChangeModel.old.ts`.
//   - This should be done when enabling the migration.
// 4. If, for performance, the migration needs to run while the server is running, add a new
//    copy of the migration that runs on server startup. This copy of the migration will be
//    responsible for migrating any remaining changes_2 entries that were added after the previous
//    run of the migration.

// A snapshot of ChangeType at the time of this migration
enum ChangeType {
	Create = 1,
	Update = 2,
	Delete = 3,
}

// It should be possible to pause and resume the migration in the background
export const config = { transaction: false };

// Assumes that:
// 1. all entries in `changes` have counters less than entries in `changes_2`
// 2. there is at least one entry in `changes_2` (should be guaranteed by the migration
//    that creates changes_2).
const lastPreMigrationCounterQuery = (db: DbConnection) => (
	db('changes_2').select({ 'counter': 'counter' }).orderBy('counter', 'desc').limit(1)
);

const migrateLegacyPage = async (db: DbConnection, start: number, end: number) => {
	logger.info(`Processing legacy changes (start=${start}, end=${end})`);

	const uuidSql = isPostgres(db) ? `
		regexp_replace(gen_random_uuid()::text, '-', '', 'g')
	` : `
		-- TODO: Check for a better way to generate IDs in SQLite.
		-- This hex(randomblob) approach is mentioned in the SQLite documentation:
		-- https://sqlite.org/lang_corefunc.html#randomblob
		lower(hex(randomblob(16)))
	`;
	await db.transaction(async transaction => {
		await transaction.raw(`
			INSERT INTO changes_3 (counter, previous_share_id, id, type, item_id, item_name, item_type, user_id, updated_time, created_time)
				SELECT
					changes.counter,
					'' as previous_share_id, -- We can't accurately determine previous_share_id here.
					${uuidSql},
					changes.type,
					changes.item_id,
					changes.item_name,
					changes.item_type,
					changes.user_id,
					changes.updated_time,
					changes.created_time
				FROM changes
				WHERE changes.counter >= ?
					AND changes.counter <= ?
					AND changes.type IN (?, ?)
				ORDER BY changes.counter ASC
		`, [start, end, ChangeType.Create, ChangeType.Delete]);
	});
};

const migrateNewPage = async (db: DbConnection, start: number, end: number) => {
	logger.info(`Processing new changes: (start=${start}, end=${end})`);

	const query = db('changes_2')
		.select('*')
		.where('counter', '>=', start)
		.where('counter', '<=', end)
		.orderBy('counter', 'asc');
	await db('changes_3').insert(query);
};

const migrateChanges = async (db: DbConnection, offset: number) => {
	let table: 'changes'|'changes_2' = 'changes';
	let counterRange: [number, number] = [offset, offset];
	// Advance to avoid re-processing the change
	offset += 1;

	const next = async () => {
		const batchSize = 100_000;
		const nextBatch = await db(table)
			.select('counter')
			.where('counter', '>=', offset)
			.orderBy('counter', 'asc')
			.limit(batchSize);
		if (!nextBatch.length) {
			if (table === 'changes') {
				table = 'changes_2';
				return true;
			}
			return false;
		}

		const processFrom = offset;
		const processTo = nextBatch[nextBatch.length - 1].counter;
		counterRange = [processFrom, processTo];

		offset = processTo + 1; // The start of the next unprocessed block
		return true;
	};

	while (await next()) {
		if (table === 'changes') {
			await migrateLegacyPage(db, counterRange[0], counterRange[1]);
		} else {
			await migrateNewPage(db, counterRange[0], counterRange[1]);
		}
	}
};

export const up = async (db: DbConnection) => {
	await db.transaction(async transaction => {
		if (await transaction.schema.hasTable('changes_3')) return;
		// This table should match changes_2 exactly.
		// Do not use "createTableLike". It fails to correctly create the bigIncrements
		// column with SQLite:
		await transaction.schema.createTable('changes_3', (table) => {
			table.bigIncrements('counter').unique().primary().notNullable();
			table.string('id', 32).unique().notNullable();

			table.string('item_id', 32).notNullable();
			table.string('user_id', 32).defaultTo('').notNullable();
			table.text('item_name').defaultTo('').notNullable();
			table.string('previous_share_id', 32).defaultTo('').notNullable();
			table.integer('item_type').notNullable();
			table.integer('type').notNullable();
			table.bigInteger('updated_time').notNullable();
			table.bigInteger('created_time').notNullable();

			table.unique(['user_id', 'counter']);
			table.index('item_id');
		});
	});

	// Storing the start offset allows the migration to be resumed after an interruption
	const startOffset = async () => {
		type ChangeSlice = {
			counter: number;
			id: Uuid;
		};
		let processedItem: ChangeSlice|undefined = undefined;

		const nextProcessedItemFromEnd = async () => {
			let lastItemQuery = db('changes_3').select('id', 'counter');
			if (processedItem) {
				lastItemQuery = lastItemQuery.where('counter', '<', processedItem.counter);
			}
			processedItem = await lastItemQuery.orderBy('counter', 'desc').first();
		};

		let originalItem;
		do {
			await nextProcessedItemFromEnd();
			if (!processedItem) return 0;

			// Select from changes based on `counter` -- the IDs for legacy changes will be different, but the counters
			// are the same:
			originalItem = await db('changes').select('id', 'counter').where('counter', '=', processedItem.counter).first();

			// IDs for new changes should match
			originalItem ??= await db('changes_2').select('id', 'counter').where('id', '=', processedItem.id).first();
		} while (!originalItem);

		// Map from changes_3 counters to changes and changes_2 counters:
		const lastCounter = originalItem.counter;
		const nextCounter = lastCounter + 1;
		return nextCounter;
	};

	const offset = await startOffset();
	const getTotal = async (tableName: string) => {
		return Object.values(
			await db(tableName)
				.count()
				.where('counter', '>=', offset)
				.first(),
		)[0];
	};

	logger.info('Migrating', await getTotal('changes') + await getTotal('changes_2'), 'changes... start', offset);

	await migrateChanges(db, offset);
	logger.info('Total migrated:', await getTotal('changes_3'));

	if (isPostgres(db)) {
		// In PostgreSQL, we need to manually specify the starting point for the
		// counter
		// https://stackoverflow.com/a/70389309
		// https://stackoverflow.com/a/2022824
		// https://www.postgresql.org/docs/current/functions-sequence.html
		const lastChanges3CounterSql = 'SELECT counter FROM changes_3 ORDER BY counter DESC LIMIT 1';
		await db.raw(`
			SELECT setval('changes_3_counter_seq', (${lastChanges3CounterSql}))
		`);
	}
};

export const down = async (db: DbConnection) => {
	await db('changes_2').insert(
		db('changes_3')
			.select('*')
			.where('counter', '>', lastPreMigrationCounterQuery(db))
			.orderBy('counter', 'asc'),
	);

	await db.schema.dropTable('changes_3');
};
