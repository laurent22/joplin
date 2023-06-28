import { Knex } from 'knex';
import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.alterTable('users', (table: Knex.CreateTableBuilder) => {
		table.integer('can_upload').defaultTo(1).notNullable();
	});

	await db('users').update({ can_upload: 1 });
};

export const down = async (_db: DbConnection) => {

};
