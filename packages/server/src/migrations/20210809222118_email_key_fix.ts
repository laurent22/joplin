// import { Knex } from 'knex';
import { DbConnection } from '../db';

export const up = async (_db: DbConnection) => {
	// try {
	// 	await db.schema.alterTable('emails', function(table: Knex.CreateTableBuilder) {
	// 		table.dropUnique(['recipient_email', 'key']);
	// 	});
	// } catch (error) {
	// 	// console.warn('Could not drop unique constraint - this is not an error.', error);
	// }
};

export const down = async (_db: DbConnection) => {

};
