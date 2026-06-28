import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.createTable('stripe_events', (table) => {
		table.string('id', 32).unique().primary().notNullable();
		table.string('stripe_id', 64).unique().notNullable();
		table.bigInteger('created_time').notNullable();
		table.bigInteger('updated_time').notNullable();
		table.integer('status').notNullable();
	});
};

export const down = async (db: DbConnection) => {
	await db.schema.dropTable('stripe_events');
};
