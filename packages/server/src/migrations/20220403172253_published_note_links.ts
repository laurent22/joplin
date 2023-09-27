import { Knex } from 'knex';
import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.alterTable('shares', (table: Knex.CreateTableBuilder) => {
		table.specificType('recursive', 'smallint').defaultTo(0).nullable();
	});
};

export const down = async (db: DbConnection) => {
	await db.schema.alterTable('shares', (table: Knex.CreateTableBuilder) => {
		table.dropColumn('recursive');
	});
};
