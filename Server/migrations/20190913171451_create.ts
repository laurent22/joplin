import * as Knex from 'knex';
import UserModel from '../app/models/UserModel';

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
		table.integer('can_read').defaultTo(0).notNullable();
		table.integer('can_write').defaultTo(0).notNullable();
		table.integer('updated_time').notNullable();
		table.integer('created_time').notNullable();
	});

	await knex.schema.alterTable('permissions', function(table:Knex.CreateTableBuilder) {
		table.unique(['user_id', 'item_type', 'item_id']);
	});

	await knex.schema.createTable('files', function(table:Knex.CreateTableBuilder) {
		table.string('id', 32).unique().primary().notNullable();
		table.string('owner_id', 32).notNullable();
		table.text('name').notNullable();
		table.binary('content').defaultTo('').notNullable();
		table.string('mime_type', 128).defaultTo('application/octet-stream').notNullable();
		table.integer('size').defaultTo(0).notNullable();
		table.integer('is_directory').defaultTo(0).notNullable();
		table.integer('is_root').defaultTo(0).notNullable();
		table.string('parent_id', 32).defaultTo('').notNullable();
		table.integer('updated_time').notNullable();
		table.integer('created_time').notNullable();
	});

	await knex.schema.alterTable('files', function(table:Knex.CreateTableBuilder) {
		table.unique(['parent_id', 'name']);
	});

	const userModel = new UserModel();

	// We skip validation because at this point there's no user in the system so
	// there can't be an owner for that first user.
	await userModel.save({
		email: 'admin@localhost',
		password: 'admin',
		is_admin: 1,
	}, { skipValidation: true});
}

export async function down(knex: Knex): Promise<any> {
	await knex.schema.dropTable('users');
	await knex.schema.dropTable('sessions');
	await knex.schema.dropTable('permissions');
	await knex.schema.dropTable('files');
}

