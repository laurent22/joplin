import { DbConnection } from '../db';

export const up = async (db: DbConnection) => {
	await db.schema.alterTable('users', (table) => {
		table.string('sso_auth_code').defaultTo('').notNullable();
		table.integer('sso_auth_code_expire_at').defaultTo(0).notNullable();
	});
};

export const down = async (db: DbConnection) => {
	await db.schema.alterTable('users', (table) => {
		table.dropColumn('sso_auth_code');
		table.dropColumn('sso_auth_code_expire_at');
	});
};
