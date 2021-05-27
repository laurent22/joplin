import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.alterTable('users', function(table: Knex.CreateTableBuilder) {
		table.integer('can_upload').defaultTo(1).notNullable();
	});

	await db('users').update({ can_upload: 1 });
}

export async function down(_db: DbConnection): Promise<any> {

}
