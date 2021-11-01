import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.createTable('locks', (table: Knex.CreateTableBuilder) => {
		table.uuid('id').unique().primary().notNullable();
		table.string('user_id', 32).notNullable();
		table.integer('type', 2).notNullable();
		table.string('client_type', 32).notNullable();
		table.string('client_id', 32).notNullable();
		table.bigInteger('updated_time').notNullable();
		table.bigInteger('created_time').notNullable();
	});

	await db.schema.alterTable('locks', (table: Knex.CreateTableBuilder) => {
		table.index('user_id');
		table.index('created_time');
	});
}

export async function down(db: DbConnection): Promise<any> {
	await db.schema.dropTable('locks');
}
