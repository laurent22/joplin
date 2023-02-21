import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.alterTable('users', (table: Knex.CreateTableBuilder) => {
		table.specificType('enabled', 'smallint').defaultTo(1).nullable();
	});

	await db.schema.alterTable('subscriptions', (table: Knex.CreateTableBuilder) => {
		table.specificType('is_deleted', 'smallint').defaultTo(0).nullable();
	});
}

export async function down(_db: DbConnection): Promise<any> {

}
