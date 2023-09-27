import { Knex } from 'knex';
import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.createTable('storages', (table: Knex.CreateTableBuilder) => {
		table.increments('id').unique().primary().notNullable();
		table.text('connection_string').notNullable();
		table.bigInteger('updated_time').notNullable();
		table.bigInteger('created_time').notNullable();
	});

	const now = Date.now();

	await db('storages').insert({
		connection_string: 'Type=Database',
		updated_time: now,
		created_time: now,
	});

	// First we create the column and set a default so as to populate the
	// content_storage_id field.
	await db.schema.alterTable('items', (table: Knex.CreateTableBuilder) => {
		table.integer('content_storage_id').defaultTo(1).notNullable();
	});

	// Once it's set, we remove the default as that should be explicitly set.
	await db.schema.alterTable('items', (table: Knex.CreateTableBuilder) => {
		table.integer('content_storage_id').notNullable().alter();
	});

	await db.schema.alterTable('storages', (table: Knex.CreateTableBuilder) => {
		table.unique(['connection_string']);
	});
};

export const down = async (db: DbConnection) => {
	await db.schema.dropTable('storages');

	await db.schema.alterTable('items', (table: Knex.CreateTableBuilder) => {
		table.dropColumn('content_storage_id');
	});
};
