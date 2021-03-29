import * as Knex from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.alterTable('shares', function(table: Knex.CreateTableBuilder) {
		table.string('folder_id', 32).defaultTo('').notNullable();
	});
}

export async function down(db: DbConnection): Promise<any> {
	await db.schema.dropTable('joplin_items');
}
