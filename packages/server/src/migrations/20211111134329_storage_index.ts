import { Knex } from 'knex';
import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.alterTable('items', (table: Knex.CreateTableBuilder) => {
		table.index('content_storage_id');
	});
};

export const down = async (db: DbConnection) => {
	await db.schema.alterTable('items', (table: Knex.CreateTableBuilder) => {
		table.dropIndex('content_storage_id');
	});
};
