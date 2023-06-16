import { Knex } from 'knex';
import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.alterTable('users', (table: Knex.CreateTableBuilder) => {
		table.integer('max_item_size').defaultTo(null).nullable();
		table.specificType('can_share_folder', 'smallint').defaultTo(null).nullable();
		table.specificType('can_share_note', 'smallint').defaultTo(null).nullable();
		table.bigInteger('max_total_item_size').defaultTo(null).nullable();
	});

	await db.schema.alterTable('users', (table: Knex.CreateTableBuilder) => {
		table.integer('total_item_size').defaultTo(0).notNullable();
	});
};

export const down = async (_db: DbConnection) => {

};
