import * as Knex from 'knex';
import * as auth from '../app/utils/auth';

const { uuid } = require('lib/uuid.js');

export async function up(knex: Knex): Promise<any> {
	await knex.schema.createTable('users', function(table:Knex.CreateTableBuilder) {
		table.string('id', 32).unique().primary().notNullable();
		table.text('name', 'mediumtext').unique().notNullable();
		table.text('email', 'mediumtext').unique().notNullable();
		table.text('password', 'mediumtext').notNullable();
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
		table.string('file_id', 32).notNullable();
		table.boolean('is_owner').defaultTo(false).notNullable();
		table.boolean('can_read').defaultTo(false).notNullable();
		table.boolean('can_write').defaultTo(false).notNullable();
		table.integer('updated_time').notNullable();
		table.integer('created_time').notNullable();
	});

	await knex.schema.createTable('files', function(table:Knex.CreateTableBuilder) {
		table.string('id', 32).unique().primary().notNullable();
		table.text('name').notNullable();
		table.binary('content').defaultTo('').notNullable(); // $id: Buffer.from(item.id, 'hex')
		table.string('mime_type', 128).defaultTo('application/octet-stream').notNullable();
		table.boolean('is_directory').defaultTo(false).notNullable();
		table.string('parent_id', 32).defaultTo('').notNullable();
		table.integer('updated_time').notNullable();
		table.integer('created_time').notNullable();
	});

	const timestamp:number = Date.now();

	const userId = uuid.create();
	const fileId = uuid.create();

	await knex.insert({
		id: userId,
		name: 'admin',
		password: auth.hashPassword('admin'),
		email: 'admin@localhost',
		updated_time: timestamp,
		created_time: timestamp,
	}).into('users');

	await knex.insert({
		id: fileId,
		name: '',
		is_directory: true,
		parent_id: '',
		updated_time: timestamp,
		created_time: timestamp,
	}).into('files');

	await knex.insert({
		id: uuid.create(),
		user_id: userId,
		file_id: fileId,
		is_owner: true,
		can_read: true,
		can_write: true,
		updated_time: timestamp,
		created_time: timestamp,
	}).into('permissions');
}

export async function down(knex: Knex): Promise<any> {
	return knex.schema.dropTable('users');
}
