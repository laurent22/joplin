import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.alterTable('subscriptions', (table) => {
		table.bigInteger('trial_end').defaultTo(0).notNullable();
		table.bigInteger('current_period_end').defaultTo(0).notNullable();
	});
};

export const down = async (db: DbConnection) => {
	await db.schema.alterTable('subscriptions', (table) => {
		table.dropColumn('trial_end');
		table.dropColumn('current_period_end');
	});
};
