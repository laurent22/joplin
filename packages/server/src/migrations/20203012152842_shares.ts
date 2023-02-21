import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.createTable('shares', (table: Knex.CreateTableBuilder) => {
		table.string('id', 32).unique().primary().notNullable();
		table.string('owner_id', 32).notNullable();
		table.string('file_id', 32).notNullable();
		table.integer('type').notNullable();
		table.bigInteger('updated_time').notNullable();
		table.bigInteger('created_time').notNullable();
	});
}

export async function down(db: DbConnection): Promise<any> {
	await db.schema.dropTable('shares');
}
