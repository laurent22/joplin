import { Knex } from 'knex';
import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.alterTable('users', (table: Knex.CreateTableBuilder) => {
		table.renameColumn('can_share', 'can_share_folder');
		table.integer('can_share_note').defaultTo(1).notNullable();
	});
};

export const down = async (_db: DbConnection) => {

};
