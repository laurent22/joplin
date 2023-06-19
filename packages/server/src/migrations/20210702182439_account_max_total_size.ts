import { Knex } from 'knex';
import { DbConnection } from '../db';

// Due to a bug in Knex.js, it is not possible to drop a column and
// recreate it in the same migration. So this is split into two migrations.
// https://github.com/knex/knex/issues/2581

export const up = async (db: DbConnection) => {
	await db.schema.alterTable('users', (table: Knex.CreateTableBuilder) => {
		table.dropColumn('max_item_size');
		table.dropColumn('can_share_folder');
		table.dropColumn('can_share_note');
	});
};

export const down = async (_db: DbConnection) => {

};
