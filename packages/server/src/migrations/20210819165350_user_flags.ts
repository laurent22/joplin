import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.createTable('user_flags', function(table: Knex.CreateTableBuilder) {
		table.increments('id').unique().primary().notNullable();
		table.integer('type').defaultTo(0).notNullable();
		table.bigInteger('updated_time').notNullable();
		table.bigInteger('created_time').notNullable();
	});
}

export async function down(db: DbConnection): Promise<any> {
	await db.schema.dropTable('user_flags');
}
