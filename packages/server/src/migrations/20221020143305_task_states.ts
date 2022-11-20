import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.createTable('task_states', (table: Knex.CreateTableBuilder) => {
		table.increments('id').unique().primary().notNullable();
		table.integer('task_id').unique().notNullable();
		table.specificType('running', 'smallint').defaultTo(0).notNullable();
		table.specificType('enabled', 'smallint').defaultTo(1).notNullable();
		table.bigInteger('updated_time').notNullable();
		table.bigInteger('created_time').notNullable();
	});
}

export async function down(db: DbConnection): Promise<any> {
	await db.schema.dropTable('task_states');
}
