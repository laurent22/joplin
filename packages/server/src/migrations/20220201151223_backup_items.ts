import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.createTable('backup_items', (table: Knex.CreateTableBuilder) => {
		table.increments('id').unique().primary().notNullable();
		table.integer('type').notNullable();
		table.text('key', 'mediumtext').notNullable();
		table.string('user_id', 32).defaultTo('').notNullable();
		table.binary('content').notNullable();
		table.bigInteger('created_time').notNullable();
	});
}

export async function down(db: DbConnection): Promise<any> {
	await db.schema.dropTable('backup_items');
}
