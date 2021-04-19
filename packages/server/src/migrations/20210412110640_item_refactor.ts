import { Knex } from 'knex';
import { DbConnection } from '../db';

// parent_id: ${'parent_id' in note ? note.parent_id : defaultFolderId}
// created_time: 2020-10-15T10:34:16.044Z
// updated_time: 2021-01-28T23:10:30.054Z
// is_conflict: 0
// latitude: 0.00000000
// longitude: 0.00000000
// altitude: 0.0000
// author:
// source_url:
// is_todo: 1
// todo_due: 1602760405000
// todo_completed: 0
// source: joplindev-desktop
// source_application: net.cozic.joplindev-desktop
// application_data:
// order: 0
// user_created_time: 2020-10-15T10:34:16.044Z
// user_updated_time: 2020-10-19T17:21:03.394Z
// encryption_cipher_text:
// encryption_applied: 0
// markup_language: 1
// is_shared: 1
// type_: 1`;

export async function up(db: DbConnection): Promise<any> {
	await db.schema.createTable('items', function(table: Knex.CreateTableBuilder) {
		table.string('id', 32).unique().primary().notNullable();
		table.string('owner_id', 32).notNullable();
		table.text('name').notNullable();
		table.string('mime_type', 128).defaultTo('application/octet-stream').notNullable();
		table.bigInteger('updated_time').notNullable();
		table.bigInteger('created_time').notNullable();
		table.binary('content').defaultTo('').notNullable();
		table.integer('content_size').defaultTo(0).notNullable();
		table.string('jop_id', 32).defaultTo('').notNullable();
		table.string('jop_parent_id', 32).defaultTo('').notNullable();
		table.integer('jop_type', 2).defaultTo(0).notNullable();
		table.integer('jop_encryption_applied', 1).defaultTo(0).notNullable();
	});

	await db.schema.createTable('user_items', function(table: Knex.CreateTableBuilder) {
		table.increments('id').unique().primary().notNullable();
		table.string('user_id', 32).notNullable();
		table.string('item_id', 32).notNullable();
		table.string('share_id', 32).defaultTo('').notNullable();
		table.bigInteger('updated_time').notNullable();
		table.bigInteger('created_time').notNullable();
	});

	await db.schema.alterTable('user_items', function(table: Knex.CreateTableBuilder) {
		table.unique(['user_id', 'item_id']);
	});

	await db.schema.createTable('key_values', function(table: Knex.CreateTableBuilder) {
		table.increments('id').unique().primary().notNullable();
		table.text('key').notNullable();
		table.integer('type').notNullable();
		table.text('value').notNullable();
	});

	await db.schema.alterTable('key_values', function(table: Knex.CreateTableBuilder) {
		table.index(['key']);
	});

	await db.schema.alterTable('changes', function(table: Knex.CreateTableBuilder) {
		table.text('previous_item').defaultTo('').notNullable();
		table.string('user_id', 32).defaultTo('').notNullable();
		table.dropColumn('owner_id');
	});

	await db.schema.dropTable('permissions');
	await db.schema.dropTable('joplin_file_contents');

	// TODO: add indexes

	// TODO: add owner_id/name constraint - only one name per owner
}

export async function down(db: DbConnection): Promise<any> {
	await db.schema.dropTable('items');
}
