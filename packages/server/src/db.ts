import * as Knex from 'knex';
import { DatabaseConfig } from './utils/types';
import * as pathUtils from 'path';

const migrationDir = `${__dirname}/migrations`;
const sqliteDbDir = pathUtils.dirname(__dirname);

export type DbConnection = Knex;

export interface DbConfigConnection {
	host?: string;
	port?: number;
	user?: string;
	database?: string;
	filename?: string;
}

export interface KnexDatabaseConfig {
	client: string;
	connection: DbConfigConnection;
	useNullAsDefault?: boolean;
	asyncStackTraces?: boolean;
}

export function sqliteFilePath(dbConfig: DatabaseConfig): string {
	return `${sqliteDbDir}/db-${dbConfig.name}.sqlite`;
}

export function makeKnexConfig(dbConfig: DatabaseConfig): KnexDatabaseConfig {
	const connection: DbConfigConnection = {};

	if (dbConfig.client === 'sqlite3') {
		connection.filename = sqliteFilePath(dbConfig);
	} else {
		connection.database = dbConfig.name;
		connection.host = dbConfig.host;
		connection.port = dbConfig.port;
		connection.user = dbConfig.user;
	}

	return {
		client: dbConfig.client,
		useNullAsDefault: dbConfig.client === 'sqlite3',
		asyncStackTraces: dbConfig.asyncStackTraces,
		connection,
	};
}

export async function connectDb(dbConfig: DatabaseConfig) {
	return require('knex')(makeKnexConfig(dbConfig));
}

export async function disconnectDb(db: DbConnection) {
	await db.destroy();
}

export async function migrateDb(db: DbConnection) {
	await db.migrate.latest({
		directory: migrationDir,
		// Disable transactions because the models might open one too
		disableTransactions: true,
	});
}

export enum ItemAddressingType {
	Id = 1,
	Path,
}

export enum ItemType {
    File = 1,
    User,
}

export interface WithDates {
	updated_time?: number;
	created_time?: number;
}

export interface WithUuid {
	id?: string;
}

interface DatabaseTableColumn {
	type: string;
}

interface DatabaseTable {
	[key: string]: DatabaseTableColumn;
}

interface DatabaseTables {
	[key: string]: DatabaseTable;
}

// AUTO-GENERATED-TYPES
// Auto-generated using `npm run generate-types`
export interface User extends WithDates, WithUuid {
	email?: string;
	password?: string;
	is_admin?: number;
}

export interface Session extends WithDates, WithUuid {
	user_id?: string;
	auth_code?: string;
}

export interface Permission extends WithDates, WithUuid {
	user_id?: string;
	item_type?: ItemType;
	item_id?: string;
	can_read?: number;
	can_write?: number;
}

export interface File extends WithDates, WithUuid {
	owner_id?: string;
	name?: string;
	content?: Buffer;
	mime_type?: string;
	size?: number;
	is_directory?: number;
	is_root?: number;
	parent_id?: string;
}

export interface ApiClient extends WithDates, WithUuid {
	name?: string;
	secret?: string;
}

export const databaseSchema: DatabaseTables = {
	users: {
		id: { type: 'string' },
		email: { type: 'string' },
		password: { type: 'string' },
		is_admin: { type: 'number' },
		updated_time: { type: 'number' },
		created_time: { type: 'number' },
	},
	sessions: {
		id: { type: 'string' },
		user_id: { type: 'string' },
		auth_code: { type: 'string' },
		updated_time: { type: 'number' },
		created_time: { type: 'number' },
	},
	permissions: {
		id: { type: 'string' },
		user_id: { type: 'string' },
		item_type: { type: 'number' },
		item_id: { type: 'string' },
		can_read: { type: 'number' },
		can_write: { type: 'number' },
		updated_time: { type: 'number' },
		created_time: { type: 'number' },
	},
	files: {
		id: { type: 'string' },
		owner_id: { type: 'string' },
		name: { type: 'string' },
		content: { type: 'any' },
		mime_type: { type: 'string' },
		size: { type: 'number' },
		is_directory: { type: 'number' },
		is_root: { type: 'number' },
		parent_id: { type: 'string' },
		updated_time: { type: 'number' },
		created_time: { type: 'number' },
	},
	api_clients: {
		id: { type: 'string' },
		name: { type: 'string' },
		secret: { type: 'string' },
		updated_time: { type: 'number' },
		created_time: { type: 'number' },
	},
};
// AUTO-GENERATED-TYPES
