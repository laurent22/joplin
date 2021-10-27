import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.alterTable('items', (table: Knex.CreateTableBuilder) => {
		table.string('owner_id', 32).defaultTo('').notNullable();
	});

	await db.raw(`
		UPDATE items
		SET owner_id = user_items.user_id
		FROM user_items
		WHERE user_items.item_id = items.id
	`);

	await db.schema.alterTable('items', (table: Knex.CreateTableBuilder) => {
		table.string('owner_id', 32).notNullable().alter();
	});
}

export async function down(db: DbConnection): Promise<any> {
	await db.schema.alterTable('items', (table: Knex.CreateTableBuilder) => {
		table.dropColumn('owner_id');
	});
}
