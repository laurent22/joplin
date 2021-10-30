import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.alterTable('items', (table: Knex.CreateTableBuilder) => {
		table.unique(['name', 'owner_id']);
	});
}

export async function down(db: DbConnection): Promise<any> {
	await db.schema.alterTable('items', (table: Knex.CreateTableBuilder) => {
		table.dropUnique(['name', 'owner_id']);
	});
}
