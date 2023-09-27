import { Knex } from 'knex';
import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.alterTable('shares', (table: Knex.CreateTableBuilder) => {
		table.string('folder_id', 32).defaultTo('').notNullable();
		table.integer('is_auto', 1).defaultTo(0).notNullable();
	});
};

export const down = async (db: DbConnection) => {
	await db.schema.dropTable('joplin_items');
};
