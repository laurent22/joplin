import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	// This is another optimisation for the sub-query in ChangeModel::changesForUserQuery()
	// which retrieves all the "update" (2) changes. We make it concurrent so that it doesn't
	// lock this busy table while it's being created.
	await db.raw('CREATE INDEX IF NOT EXISTS changes_type2_counter_idx ON changes (counter) WHERE type = 2');
};

export const down = async (db: DbConnection) => {
	await db.raw('DROP INDEX changes_type2_counter_idx');
};
