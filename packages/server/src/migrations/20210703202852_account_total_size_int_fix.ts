import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.alterTable('users', (table: Knex.CreateTableBuilder) => {
		table.dropColumn('total_item_size');
	});
}

export async function down(_db: DbConnection): Promise<any> {

}
