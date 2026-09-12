import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.alterTable('subscriptions', (table) => {
		table.text('source').defaultTo('').notNullable();
	});
};

export const down = async (db: DbConnection) => {
	await db.schema.alterTable('subscriptions', (table) => {
		table.dropColumn('source');
	});
};
