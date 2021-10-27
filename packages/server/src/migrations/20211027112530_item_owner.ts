import { Knex } from 'knex';
import { DbConnection, isPostgres } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.alterTable('items', (table: Knex.CreateTableBuilder) => {
		table.string('owner_id', 32).defaultTo('').notNullable();
	});

	if (isPostgres(db)) {
		await db.raw(`
			UPDATE items
			SET owner_id = user_items.user_id
			FROM user_items
			WHERE user_items.item_id = items.id
		`);
	} else {
		// Very inefficient way to set the owner_id but SQLite is probably not
		// used with very large dataset.

		interface Row {
			id: string;
			user_id: string;
		}

		while (true) {
			const items: Row[] = await
			db('items')
				.join('user_items', 'items.id', 'user_items.item_id')
				.select(['items.id', 'user_items.user_id'])
				.where('owner_id', '=', '')
				.limit(10000);

			if (!items.length) break;

			for (const item of items) {
				await db('items').update({ owner_id: item.user_id }).where('id', '=', item.id);
			}
		}
	}

	await db.schema.alterTable('items', (table: Knex.CreateTableBuilder) => {
		table.string('owner_id', 32).notNullable().alter();
	});
}

export async function down(db: DbConnection): Promise<any> {
	await db.schema.alterTable('items', (table: Knex.CreateTableBuilder) => {
		table.dropColumn('owner_id');
	});
}
