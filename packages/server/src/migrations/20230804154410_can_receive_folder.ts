import { Knex } from 'knex';
import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.alterTable('users', (table: Knex.CreateTableBuilder) => {
		table.specificType('can_receive_folder', 'smallint').defaultTo(null).nullable();
	});
};

export const down = async (db: DbConnection) => {
	await db.schema.alterTable('users', (table: Knex.CreateTableBuilder) => {
		table.dropColumn('can_receive_folder');
	});
};
