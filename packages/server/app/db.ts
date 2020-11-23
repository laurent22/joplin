import * as Knex from 'knex';

export interface DbConfigConnection {
	host?: string;
	port?: number;
	user?: string;
	database?: string;
	filename?: string;
}

export interface DbConfig {
	client: string;
	connection: DbConfigConnection;
	useNullAsDefault?: boolean;
	asyncStackTraces?: boolean;
}

let dbConfig_: DbConfig = null;
let db_: Knex = null;

export function dbConfig(): DbConfig {
	if (!dbConfig_) throw new Error('DB config is not set');
	return dbConfig_;
}

export async function connectDb(dbConfig: DbConfig) {
	return require('knex')(dbConfig);
}

export async function connectGlobalDb(dbConfig: DbConfig) {
	dbConfig_ = JSON.parse(JSON.stringify(dbConfig));
	db_ = await connectDb(dbConfig_);
}

export async function disconnectGlobalDb() {
	await disconnectDb(db());
	db_ = null;
	dbConfig_ = null;
}

export async function disconnectDb(db: Knex) {
	await db.destroy();
}

export default function db(): Knex {
	if (!db_) throw new Error('Trying to access DB before it has been initialized');
	return db_;
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
