import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.createTable('events', (table: Knex.CreateTableBuilder) => {
		table.uuid('id').unique().notNullable();
		table.increments('counter').unique().primary().notNullable();
		table.integer('type').notNullable();
		table.string('name', 32).defaultTo('').notNullable();
		table.bigInteger('created_time').notNullable();
	});

	await db.schema.alterTable('events', (table: Knex.CreateTableBuilder) => {
		table.index('type');
		table.index('name');
	});
}

export async function down(db: DbConnection): Promise<any> {
	await db.schema.dropTable('events');
}
