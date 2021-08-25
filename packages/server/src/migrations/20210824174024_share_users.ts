import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.alterTable('share_users', (table: Knex.CreateTableBuilder) => {
		table.text('master_key', 'mediumtext').defaultTo('').notNullable();
	});
}

export async function down(db: DbConnection): Promise<any> {
	await db.schema.alterTable('share_users', (table: Knex.CreateTableBuilder) => {
		table.dropColumn('master_key');
	});
}
