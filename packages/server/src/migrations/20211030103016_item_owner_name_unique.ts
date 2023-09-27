import { Knex } from 'knex';
import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.alterTable('items', (table: Knex.CreateTableBuilder) => {
		table.unique(['name', 'owner_id']);
	});
};

export const down = async (db: DbConnection) => {
	await db.schema.alterTable('items', (table: Knex.CreateTableBuilder) => {
		table.dropUnique(['name', 'owner_id']);
	});
};
