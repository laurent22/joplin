import { Knex } from 'knex';
import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.createTable('joplin_file_contents', (table: Knex.CreateTableBuilder) => {
		table.string('id', 32).unique().primary().notNullable();
		table.string('owner_id', 32).notNullable();
		table.string('item_id', 32).notNullable();
		table.string('parent_id', 32).defaultTo('').notNullable();
		table.integer('type', 2).notNullable();
		table.bigInteger('updated_time').notNullable();
		table.bigInteger('created_time').notNullable();
		table.integer('encryption_applied', 1).notNullable();
		table.binary('content').defaultTo('').notNullable();
	});

	await db.schema.alterTable('files', (table: Knex.CreateTableBuilder) => {
		table.integer('content_type', 2).defaultTo(1).notNullable();
		table.string('content_id', 32).defaultTo('').notNullable();
	});
};

export const down = async (db: DbConnection) => {
	await db.schema.dropTable('joplin_file_contents');
};
