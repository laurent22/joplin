import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.alterTable('users', (table) => {
		table.integer('is_external').defaultTo(0).notNullable();
	});
};

export const down = async (db: DbConnection) => {
	await db.schema.alterTable('users', (table) => {
		table.dropColumn('is_external');
	});
};
