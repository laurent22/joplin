import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.alterTable('shares', (table: Knex.CreateTableBuilder) => {
		table.specificType('recursive', 'smallint').defaultTo(0).nullable();
	});
}

export async function down(db: DbConnection): Promise<any> {
	await db.schema.alterTable('shares', (table: Knex.CreateTableBuilder) => {
		table.dropColumn('recursive');
	});
}
