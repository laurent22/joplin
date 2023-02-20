import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.alterTable('shares', (table: Knex.CreateTableBuilder) => {
		table.string('folder_id', 32).defaultTo('').notNullable();
		table.integer('is_auto', 1).defaultTo(0).notNullable();
	});
}

export async function down(db: DbConnection): Promise<any> {
	await db.schema.dropTable('joplin_items');
}
