import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.alterTable('users', function(table: Knex.CreateTableBuilder) {
		table.integer('email_confirmed').defaultTo(0).notNullable();
		table.integer('email_confirmation_sent').defaultTo(0).notNullable();
	});

	await db('users').update({ email_confirmed: 1, email_confirmation_sent: 1 });
}

export async function down(_db: DbConnection): Promise<any> {

}
