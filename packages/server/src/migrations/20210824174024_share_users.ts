import { Knex } from 'knex';
import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.alterTable('share_users', (table: Knex.CreateTableBuilder) => {
		table.text('master_key', 'mediumtext').defaultTo('').notNullable();
	});

	await db.schema.alterTable('shares', (table: Knex.CreateTableBuilder) => {
		table.string('master_key_id', 32).defaultTo('').notNullable();
	});
};

export const down = async (db: DbConnection) => {
	await db.schema.alterTable('share_users', (table: Knex.CreateTableBuilder) => {
		table.dropColumn('master_key');
	});

	await db.schema.alterTable('shares', (table: Knex.CreateTableBuilder) => {
		table.dropColumn('master_key_id');
	});
};
