import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.alterTable('items', (table: Knex.CreateTableBuilder) => {
		table.index('content_storage_id');
	});
}

export async function down(db: DbConnection): Promise<any> {
	await db.schema.alterTable('items', (table: Knex.CreateTableBuilder) => {
		table.dropIndex('content_storage_id');
	});
}
