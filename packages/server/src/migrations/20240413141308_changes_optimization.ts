import { DbConnection, isPostgres } from '../db';

// CREATE INDEX CONCURRENTLY cannot run within a transaction
export const config = { transaction: false };

export const up = async (db: DbConnection) => {
	if (isPostgres(db)) {
		// This is to optimize the sub-query in ChangeModel::changesForUserQuery() which retrieves
		// the item creations and deletions. We make it concurrent so that it doesn't lock this busy
		// table while it's being created.
		await db.raw('CREATE INDEX CONCURRENTLY IF NOT EXISTS changes_user_id_counter_index ON changes (user_id, counter)');
	}
};

export const down = async (db: DbConnection) => {
	if (isPostgres(db)) {
		await db.raw('DROP INDEX changes_user_id_counter_index');
	}
};
