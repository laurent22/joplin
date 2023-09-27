import { Knex } from 'knex';
import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	try {
		await db.schema.alterTable('emails', (table: Knex.CreateTableBuilder) => {
			table.text('key', 'mediumtext').defaultTo('').notNullable();
		});
	} catch (error) {
		console.warn('Could not add "emails.key" column', error);
	}

	// await db.schema.alterTable('emails', function(table: Knex.CreateTableBuilder) {
	// 	table.unique(['recipient_email', 'key']);
	// });
};

export const down = async (_db: DbConnection) => {

};
