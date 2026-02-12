import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<void> {
	await db.schema.createTable('recovery_codes', (table: Knex.CreateTableBuilder) => {
		table.uuid('id').unique().notNullable();
		table.string('user_id', 32).notNullable().defaultTo('');
		table.string('code', 16).notNullable().defaultTo('');
		table.specificType('is_used', 'smallint').defaultTo(1).notNullable();

		table.bigInteger('updated_time').notNullable();
		table.bigInteger('created_time').notNullable();
	});
}

export async function down(db: DbConnection): Promise<void> {
	await db.schema.dropTable('recovery_codes');
}
