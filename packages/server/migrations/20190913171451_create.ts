import * as Knex from 'knex';
import uuidgen from '../app/utils/uuidgen';
import { hashPassword } from '../app/utils/auth';

export async function up(knex: Knex): Promise<any> {
	await knex.schema.createTable('users', function(table: Knex.CreateTableBuilder) {
		table.string('id', 32).unique().primary().notNullable();
		table.text('email', 'mediumtext').unique().notNullable();
		table.text('password', 'mediumtext').notNullable();
		table.integer('is_admin').defaultTo(0).notNullable();
		table.bigInteger('updated_time').notNullable();
		table.bigInteger('created_time').notNullable();
	});

	await knex.schema.createTable('sessions', function(table: Knex.CreateTableBuilder) {
		table.string('id', 32).unique().primary().notNullable();
		table.string('user_id', 32).notNullable();
		table.string('auth_code', 32).defaultTo('').notNullable();
		table.bigInteger('updated_time').notNullable();
		table.bigInteger('created_time').notNullable();
	});

	await knex.schema.createTable('permissions', function(table: Knex.CreateTableBuilder) {
		table.string('id', 32).unique().primary().notNullable();
		table.string('user_id', 32).notNullable();
		table.integer('item_type').notNullable();
		table.string('item_id', 32).notNullable();
		table.integer('can_read').defaultTo(0).notNullable();
		table.integer('can_write').defaultTo(0).notNullable();
		table.bigInteger('updated_time').notNullable();
		table.bigInteger('created_time').notNullable();
	});

	await knex.schema.alterTable('permissions', function(table: Knex.CreateTableBuilder) {
		table.unique(['user_id', 'item_type', 'item_id']);
	});

	await knex.schema.createTable('files', function(table: Knex.CreateTableBuilder) {
		table.string('id', 32).unique().primary().notNullable();
		table.string('owner_id', 32).notNullable();
		table.text('name').notNullable();
		table.binary('content').defaultTo('').notNullable();
		table.string('mime_type', 128).defaultTo('application/octet-stream').notNullable();
		table.integer('size').defaultTo(0).notNullable();
		table.integer('is_directory').defaultTo(0).notNullable();
		table.integer('is_root').defaultTo(0).notNullable();
		table.string('parent_id', 32).defaultTo('').notNullable();
		table.bigInteger('updated_time').notNullable();
		table.bigInteger('created_time').notNullable();
	});

	await knex.schema.alterTable('files', function(table: Knex.CreateTableBuilder) {
		table.unique(['parent_id', 'name']);
	});

	await knex.schema.createTable('api_clients', function(table: Knex.CreateTableBuilder) {
		table.string('id', 32).unique().primary().notNullable();
		table.string('name', 32).notNullable();
		table.string('secret', 32).notNullable();
		table.bigInteger('updated_time').notNullable();
		table.bigInteger('created_time').notNullable();
	});

	const now = Date.now();
	const adminId = uuidgen();
	const rootFileId = uuidgen();

	await knex('users').insert({
		id: adminId,
		email: 'admin@localhost',
		password: hashPassword('admin'),
		is_admin: 1,
		updated_time: now,
		created_time: now,
	});

	await knex('files').insert({
		id: rootFileId,
		owner_id: adminId,
		name: rootFileId,
		is_directory: 1,
		is_root: 1,
		updated_time: now,
		created_time: now,
	});

	await knex('api_clients').insert({
		id: 'lVis00WF590ZVlRYiXVRWv',
		name: 'Joplin',
		secret: 'sdrNUPtKNdY5Z5tF4bthqu',
		updated_time: now,
		created_time: now,
	});
}

export async function down(knex: Knex): Promise<any> {
	await knex.schema.dropTable('users');
	await knex.schema.dropTable('sessions');
	await knex.schema.dropTable('permissions');
	await knex.schema.dropTable('files');
	await knex.schema.dropTable('api_clients');
}

