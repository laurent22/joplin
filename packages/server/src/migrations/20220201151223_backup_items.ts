import { Knex } from 'knex';
import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.createTable('backup_items', (table: Knex.CreateTableBuilder) => {
		table.increments('id').unique().primary().notNullable();
		table.integer('type').notNullable();
		table.text('key', 'mediumtext').notNullable();
		table.string('user_id', 32).defaultTo('').notNullable();
		table.binary('content').notNullable();
		table.bigInteger('created_time').notNullable();
	});
};

export const down = async (db: DbConnection) => {
	await db.schema.dropTable('backup_items');
};
