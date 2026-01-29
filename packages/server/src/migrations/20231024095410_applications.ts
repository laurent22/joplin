import { Knex } from 'knex';
import { DbConnection, isPostgres } from '../db';

export async function up(db: DbConnection): Promise<void> {
	await db.schema.createTable('applications', (table: Knex.CreateTableBuilder) => {
		table.uuid('id').unique().notNullable();
		table.string('user_id', 32).notNullable().defaultTo('');
		table.text('password', 'mediumtext').notNullable().defaultTo('');

		table.string('version', 16).notNullable().defaultTo('');
		table.integer('platform').notNullable();
		if (isPostgres(db)) {
			table.specificType('ip', 'inet');
		} else {
			table.string('ip', 64).notNullable();
		}
		table.integer('type').notNullable();

		table.bigInteger('updated_time').notNullable();
		table.bigInteger('created_time').notNullable();
		table.bigInteger('last_access_time').nullable().defaultTo(0);

		table.index('user_id');
	});

	await db.schema.alterTable('sessions', (table: Knex.CreateTableBuilder) => {
		table.uuid('application_id').nullable().defaultTo(null);

		table.index('application_id');
	});
}

export async function down(db: DbConnection): Promise<void> {
	await db.schema.dropTable('applications');
	await db.schema.alterTable('sessions', (table: Knex.CreateTableBuilder) => {
		table.dropColumn('application_id');
	});
}
