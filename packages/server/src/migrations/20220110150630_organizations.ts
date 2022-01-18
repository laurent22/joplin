import { Knex } from 'knex';
import { DbConnection } from '../db';

export async function up(db: DbConnection): Promise<any> {
	await db.schema.createTable('organizations', (table: Knex.CreateTableBuilder) => {
		table.uuid('id').unique().notNullable();
		table.string('name', 64).notNullable();
		table.string('owner_id', 32).notNullable();
		table.integer('max_users').defaultTo(1).notNullable();
		table.bigInteger('updated_time').notNullable();
		table.bigInteger('created_time').notNullable();
	});

	await db.schema.createTable('organization_users', (table: Knex.CreateTableBuilder) => {
		table.uuid('id').unique().notNullable();
		table.uuid('organization_id').notNullable();
		table.string('user_id', 32).defaultTo(null).nullable();
		table.text('invitation_email', 'mediumtext').defaultTo('').notNullable();
		table.integer('invitation_status').defaultTo(0).notNullable();
		table.specificType('is_admin', 'smallint').defaultTo(0).nullable();
		table.bigInteger('updated_time').notNullable();
		table.bigInteger('created_time').notNullable();
	});

	await db.schema.alterTable('organization_users', (table: Knex.CreateTableBuilder) => {
		table.unique(['user_id']);
	});
}

export async function down(db: DbConnection): Promise<any> {
	await db.schema.dropTable('organizations');
	await db.schema.dropTable('organization_users');
}
