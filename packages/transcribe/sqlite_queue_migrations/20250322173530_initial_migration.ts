import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
	await knex.schema.createTable('queue', (table) => {
		table.string('name').unique().primary().notNullable();
		table.datetime('created_on').defaultTo(knex.fn.now());
		table.datetime('updated_on').defaultTo(null);
	});

	await knex.schema.createTable('job', (table) => {
		table.uuid('id').unique().primary().notNullable().defaultTo(knex.fn.uuid());
		table.string('name').notNullable();
		table.jsonb('data');
		table.tinyint('state').notNullable().defaultTo(0);
		table.tinyint('retry_count').notNullable().defaultTo(0);
		table.jsonb('output');
		table.datetime('started_on');
		table.datetime('completed_on');
		table.datetime('created_on').defaultTo(knex.fn.now());
		table.datetime('updated_on').defaultTo(null);

		table.foreign('name').references('queue.name');
	});
}


export async function down(knex: Knex): Promise<void> {
	await knex.schema.dropTable('job');
	await knex.schema.dropTable('queue');
}

