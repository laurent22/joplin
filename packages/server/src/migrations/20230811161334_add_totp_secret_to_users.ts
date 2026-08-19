import { Knex } from 'knex';
import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.alterTable('users', (table: Knex.CreateTableBuilder) => {
		table.string('totp_secret').defaultTo('').notNullable();
	});
};

export const down = async (db: DbConnection) => {
	await db.schema.alterTable('users', (table: Knex.CreateTableBuilder) => {
		table.dropColumn('totp_secret');
	});
};
