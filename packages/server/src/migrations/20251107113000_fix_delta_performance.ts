import { DbConnection, isPostgres } from '../db';

// CREATE INDEX CONCURRENTLY cannot run within a transaction
export const config = { transaction: false };

export const up = async (db: DbConnection) => {
	if (isPostgres(db)) {
		// This is to optimize the sub-query in ChangeModel::changesForUserQuery() which retrieves
		// the item creations and deletions. Having `item_id` first in the index helps PostgreSQL
		// quickly find all rows in `changes` that belong to a specific `item_id`. We also filter it
		// to `type = 2` (updates) because finding the changes for other types is done in a
		// different query and is much easier.
		await db.raw('CREATE INDEX CONCURRENTLY IF NOT EXISTS changes_item_id_counter_type2_index ON changes (item_id, counter) WHERE type = 2');

		// Drop the old counter-only index. If it remains, the planner wrongly prefers it because it
		// appears ideal for `ORDER BY counter`, but in reality it forces Postgres to scan millions
		// of rows to find matching item_ids.
		await db.raw('DROP INDEX CONCURRENTLY IF EXISTS changes_type2_counter_idx');
	}
};

export const down = async (db: DbConnection) => {
	if (isPostgres(db)) {
		await db.raw('DROP INDEX CONCURRENTLY IF EXISTS changes_item_id_counter_type2_index');
		await db.raw('CREATE INDEX CONCURRENTLY IF NOT EXISTS changes_type2_counter_idx ON changes (counter) WHERE type = 2');
	}
};
