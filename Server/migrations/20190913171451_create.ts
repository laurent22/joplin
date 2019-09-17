import * as Knex from 'knex';
import * as auth from '../app/utils/auth';

const { uuid } = require('lib/uuid.js');

export async function up(knex: Knex): Promise<any> {
	await knex.schema.createTable('users', function(table:Knex.CreateTableBuilder) {
		table.string('id', 32).unique().primary().notNullable();
		table.text('email', 'mediumtext').unique().notNullable();
		table.text('password', 'mediumtext').notNullable();
		table.integer('is_admin').defaultTo(0).notNullable();
		table.integer('updated_time').notNullable();
		table.integer('created_time').notNullable();
	});

	await knex.schema.createTable('sessions', function(table:Knex.CreateTableBuilder) {
		table.string('id', 32).unique().primary().notNullable();
		table.string('user_id', 32).notNullable();
		table.integer('updated_time').notNullable();
		table.integer('created_time').notNullable();
	});

	await knex.schema.createTable('permissions', function(table:Knex.CreateTableBuilder) {
		table.string('id', 32).unique().primary().notNullable();
		table.string('user_id', 32).notNullable();
		table.integer('item_type').notNullable();
		table.string('item_id', 32).notNullable();
		table.integer('is_owner').defaultTo(0).notNullable();
		table.integer('can_read').defaultTo(0).notNullable();
		table.integer('can_write').defaultTo(0).notNullable();
		table.integer('updated_time').notNullable();
		table.integer('created_time').notNullable();
	});

	await knex.schema.createTable('files', function(table:Knex.CreateTableBuilder) {
		table.string('id', 32).unique().primary().notNullable();
		table.text('name').notNullable();
		table.binary('content').defaultTo('').notNullable(); // $id: Buffer.from(item.id, 'hex')
		table.string('mime_type', 128).defaultTo('application/octet-stream').notNullable();
		table.integer('is_directory').defaultTo(0).notNullable();
		table.string('parent_id', 32).defaultTo('').notNullable();
		table.integer('updated_time').notNullable();
		table.integer('created_time').notNullable();
	});

	const timestamp:number = Date.now();

	const userId = uuid.create();
	const fileId = uuid.create();

	await knex.insert({
		id: userId,
		password: auth.hashPassword('admin'),
		email: 'admin@localhost',
		is_admin: 1,
		updated_time: timestamp,
		created_time: timestamp,
	}).into('users');

	await knex.insert({
		id: fileId,
		name: '',
		is_directory: 1,
		parent_id: '',
		updated_time: timestamp,
		created_time: timestamp,
	}).into('files');

	await knex.insert({
		id: uuid.create(),
		user_id: userId,
		item_type: 1,
		item_id: fileId,
		is_owner: 1,
		can_read: 1,
		can_write: 1,
		updated_time: timestamp,
		created_time: timestamp,
	}).into('permissions');
}

export async function down(knex: Knex): Promise<any> {
	return knex.schema.dropTable('users');
}
