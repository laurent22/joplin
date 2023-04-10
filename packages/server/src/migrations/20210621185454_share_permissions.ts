import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.alterTable('users', (table: Knex.CreateTableBuilder) => {
		table.renameColumn('can_share', 'can_share_folder');
		table.integer('can_share_note').defaultTo(1).notNullable();
	});
}

export async function down(_db: DbConnection): Promise<any> {

}
