import { Knex } from 'knex';
import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.createTable('user_deletions', (table: Knex.CreateTableBuilder) => {
		table.increments('id').unique().primary().notNullable();
		table.string('user_id', 32).notNullable();
		table.specificType('process_data', 'smallint').defaultTo(0).notNullable();
		table.specificType('process_account', 'smallint').defaultTo(0).notNullable();
		table.bigInteger('scheduled_time').notNullable();
		table.bigInteger('start_time').defaultTo(0).notNullable();
		table.bigInteger('end_time').defaultTo(0).notNullable();
		table.integer('success').defaultTo(0).notNullable();
		table.text('error', 'mediumtext').defaultTo('').notNullable();
		table.bigInteger('updated_time').notNullable();
		table.bigInteger('created_time').notNullable();
	});

	await db.schema.alterTable('user_deletions', (table: Knex.CreateTableBuilder) => {
		table.unique(['user_id']);
	});
};

export const down = async (db: DbConnection) => {
	await db.schema.dropTable('user_deletions');
};
