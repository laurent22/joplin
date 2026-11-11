import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.alterTable('tokens', (table) => {
		table.string('purpose', 32).defaultTo('').notNullable();
	});
};

export const down = async (db: DbConnection) => {
	await db.schema.alterTable('tokens', (table) => {
		table.dropColumn('purpose');
	});
};
