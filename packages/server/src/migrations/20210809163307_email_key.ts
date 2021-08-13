import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.alterTable('emails', function(table: Knex.CreateTableBuilder) {
		table.text('key', 'mediumtext').defaultTo('').notNullable();
	});

	// await db.schema.alterTable('emails', function(table: Knex.CreateTableBuilder) {
	// 	table.unique(['recipient_email', 'key']);
	// });
}

export async function down(_db: DbConnection): Promise<any> {

}
