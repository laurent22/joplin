import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.createTable('storages', (table: Knex.CreateTableBuilder) => {
		table.increments('id').unique().primary().notNullable();
		table.text('connection_string').notNullable();
	});

	await db('storages').insert({
		connection_string: 'Type=Database',
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
}

export async function down(db: DbConnection): Promise<any> {
	await db.schema.dropTable('storages');

	await db.schema.alterTable('items', (table: Knex.CreateTableBuilder) => {
		table.dropColumn('content_storage_id');
	});
}
