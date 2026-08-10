import { strict as assert } from 'assert';
import { DbConnection, isPostgres } from '../db';
import { uuidgen } from '../utils/uuid';

export const up = async (db: DbConnection) => {
	await db.schema.createTable('changes_2', (table) => {
		// The counter is the internal change identifier and is used for ordering.
		// In PostgreSQL, .increments has a maximum value a little over 2 billion
		// (see https://www.postgresql.org/docs/current/datatype-numeric.html) so
		// we use .bigIncrements
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

	const lastOldChange = await db('changes').select('counter').orderBy('counter', 'desc').first();
	let startCounter = 1;
	if (lastOldChange) {
		assert.ok(isFinite(lastOldChange.counter));
		// Start the new counter from well after the last old change.
		// This allows the migration to run while server instances are still connected to the database,
		// provided that `changes` doesn't more than double in size before all connected servers
		// restart.
		startCounter = lastOldChange.counter * 2 + 1;
	}

	// Create a single starting change to ensure that `counter` starts incrementing in
	// the new table from where it left of in the old:
	await db('changes_2').insert({
		counter: startCounter,
		id: uuidgen(),
		item_id: '',
		user_id: '',
		item_type: 0,
		previous_share_id: '',
		type: 1,
		created_time: Date.now(),
		updated_time: Date.now(),
	});

	if (isPostgres(db)) {
		// In PostgreSQL, an initial entry with a specific value isn't enough
		// and the sequence needs to be altered to start from a specific counter:
		// https://stackoverflow.com/a/70389309
		await db.raw(`
			ALTER SEQUENCE "changes_2_counter_seq" RESTART WITH ${Number(startCounter + 1)}
		`);
	}
};

export const down = async (db: DbConnection) => {
	await db.raw(`
		INSERT INTO changes (previous_item, id, type, item_id, item_name, item_type, user_id, updated_time, created_time)
			SELECT
				json_object('jop_share_id' ${isPostgres(db) ? 'VALUE' : ','} changes_2.previous_share_id),
				changes_2.id,
				changes_2.type,
				changes_2.item_id,
				changes_2.item_name,
				changes_2.item_type,
				changes_2.user_id,
				changes_2.updated_time,
				changes_2.created_time
			FROM changes_2
			ORDER BY changes_2.counter ASC
			-- Skip the first (migration marker) change in changes_2.
			-- Note: A negative limit means "unbounded" in SQLite.
			LIMIT ${isPostgres(db) ? 'ALL' : '-1'} OFFSET 1
	`);
	await db.schema.dropTable('changes_2');
};
