import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.alterTable('users', (table: Knex.CreateTableBuilder) => {
		table.integer('can_share').defaultTo(1).notNullable();
	});
}

export async function down(_db: DbConnection): Promise<any> {

}
