// import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(_db: DbConnection): Promise<any> {
	// try {
	// 	await db.schema.alterTable('emails', function(table: Knex.CreateTableBuilder) {
	// 		table.dropUnique(['recipient_email', 'key']);
	// 	});
	// } catch (error) {
	// 	// console.warn('Could not drop unique constraint - this is not an error.', error);
	// }
}

export async function down(_db: DbConnection): Promise<any> {

}
