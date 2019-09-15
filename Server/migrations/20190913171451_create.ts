import * as Knex from "knex";
import * as auth from "../app/auth"

const { uuid } = require('lib/uuid.js');

export async function up(knex: Knex): Promise<any> {
	await knex.schema.createTable('users', function(table:Knex.CreateTableBuilder) {
		table.string('id', 32).primary().notNullable();
		table.text('name', 'mediumtext').notNullable();
		table.text('email', 'mediumtext').notNullable();
		table.text('password', 'mediumtext').notNullable();
	});

	await knex.schema.createTable('sessions', function(table:Knex.CreateTableBuilder) {
		table.string('id', 32).primary().notNullable();
		table.string('user_id', 32).notNullable();
		table.integer('updated_time').notNullable();
		table.integer('created_time').notNullable();
	});

	await knex.insert({id: uuid.create(), name: 'admin', password: auth.hashPassword('admin'), email: 'admin@localhost'}).into('users');
}

export async function down(knex: Knex): Promise<any> {
	return knex.schema.dropTable('users');
}
