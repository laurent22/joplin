import { Knex } from 'knex';
import { DbConnection } from '../db';
import { msleep } from '../utils/time';

export const up = async (db: DbConnection) => {
	if (!(await db.schema.hasColumn('items', 'owner_id'))) {
		await db.schema.alterTable('items', (table: Knex.CreateTableBuilder) => {
			table.string('owner_id', 32).defaultTo('').notNullable();
		});
	}

	// This query never finishes - so can't use it

	// await db.raw(`
	// 	UPDATE items^
	// 	SET owner_id = user_items.user_id
	// 	FROM user_items
	// 	WHERE user_items.item_id = items.id
	// `);

	interface Row {
		id: string;
		user_id: string;
	}

	const pageSize = 1000;

	const itemCount = (await db('items')
		.count('id', { as: 'total' })
		.where('owner_id', '=', '')
		.first())['total'];

	let itemDone = 0;

	while (true) {
		const items: Row[] = await db('items')
			.join('user_items', 'items.id', 'user_items.item_id')
			.select(['items.id', 'user_items.user_id'])
			.where('owner_id', '=', '')
			.limit(pageSize);

		if (!items.length) break;

		// eslint-disable-next-line no-console
		console.info(`Processing items ${itemDone} / ${itemCount}`);

		await db.transaction(async trx => {
			for (const item of items) {
				await trx('items').update({ owner_id: item.user_id }).where('id', '=', item.id);
			}
		});

		itemDone += items.length;

		await msleep(10000);
	}

	await db.schema.alterTable('items', (table: Knex.CreateTableBuilder) => {
		table.string('owner_id', 32).notNullable().alter();
	});
};

export const down = async (db: DbConnection) => {
	await db.schema.alterTable('items', (table: Knex.CreateTableBuilder) => {
		table.dropColumn('owner_id');
	});
};
