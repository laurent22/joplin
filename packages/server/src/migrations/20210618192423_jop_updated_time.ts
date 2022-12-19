import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.alterTable('items', function(table: Knex.CreateTableBuilder) {
		table.bigInteger('jop_updated_time').defaultTo(0).notNullable();
	});

	while (true) {
		const items = await db('items')
			.select('id', 'content')
			.where('jop_type', '>', 0)
			.andWhere('jop_updated_time', '=', 0)
			.limit(1000);

		if (!items.length) break;

		await db.transaction(async trx => {
			for (const item of items) {
				const unserialized = JSON.parse(item.content);
				await trx('items').update({ jop_updated_time: unserialized.updated_time }).where('id', '=', item.id);
			}
		});
	}
}

export async function down(_db: DbConnection): Promise<any> {

}
