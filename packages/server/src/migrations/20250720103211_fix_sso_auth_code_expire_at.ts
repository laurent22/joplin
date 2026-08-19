import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.alterTable('users', (table) => {
		table.bigInteger('sso_auth_code_expire_at').defaultTo(0).notNullable().alter();
	});
};

export const down = async (db: DbConnection) => {
	await db.schema.alterTable('users', (table) => {
		table.integer('sso_auth_code_expire_at').defaultTo(0).notNullable().alter();
	});
};
