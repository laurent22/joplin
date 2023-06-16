import { Knex } from 'knex';
import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.alterTable('users', (table: Knex.CreateTableBuilder) => {
		table.integer('max_item_size').defaultTo(0).notNullable();
	});
};

export const down = async (_db: DbConnection) => {

};
