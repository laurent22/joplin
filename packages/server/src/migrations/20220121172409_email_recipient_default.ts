import { Knex } from 'knex';
import { DbConnection } from '../db';

// Email recipient_id was incorrectly set to "0" by default. This migration set
// it to an empty string by default, and update all rows that have "0" as
// recipient_id.

export const up = async (db: DbConnection) => {
	await db.schema.alterTable('emails', (table: Knex.CreateTableBuilder) => {
		table.string('recipient_id', 32).defaultTo('').notNullable().alter();
	});

	await db('emails').update({ recipient_id: '' }).where('recipient_id', '=', '0');
};

export const down = async (db: DbConnection) => {
	await db.schema.alterTable('emails', (table: Knex.CreateTableBuilder) => {
		table.string('recipient_id', 32).defaultTo(0).notNullable().alter();
	});
};
