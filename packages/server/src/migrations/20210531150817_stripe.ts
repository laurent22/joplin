import { Knex } from 'knex';
import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.createTable('subscriptions', (table: Knex.CreateTableBuilder) => {
		table.increments('id').unique().primary().notNullable();
		table.string('user_id', 32).notNullable();
		table.string('stripe_user_id', 64).notNullable();
		table.string('stripe_subscription_id', 64).notNullable();
		table.bigInteger('last_payment_time').notNullable();
		table.bigInteger('last_payment_failed_time').defaultTo(0).notNullable();
		table.bigInteger('updated_time').notNullable();
		table.bigInteger('created_time').notNullable();
	});
};

export const down = async (_db: DbConnection) => {

};
