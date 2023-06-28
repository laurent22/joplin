import { Knex } from 'knex';
import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.alterTable('users', (table: Knex.CreateTableBuilder) => {
		table.dropColumn('total_item_size');
	});
};

export const down = async (_db: DbConnection) => {

};
