import * as Knex from 'knex';
import fs from 'fs-extra';

const packageRootDir = __dirname + '/../..'
const nodeEnv = process.env.NODE_ENV || 'development';

let dbConfig_:any = null;
let db_:Knex = null;

export function dbConfig() {
	if (!dbConfig_) throw new Error('DB config is not set');
	return dbConfig_;
}

export async function initDb(name:string = null) {
	name = name || nodeEnv;

	dbConfig_ = {
		client: 'sqlite3',
		connection: {
			filename: `${packageRootDir}/db-${name}.sqlite`,
		},
		useNullAsDefault: true,
		// Allow propery stack traces in case of an error, however
		// it has a small performance overhead so only enable in testing and dev
		asyncStackTraces: nodeEnv == 'development' || nodeEnv === 'testing',
		// debug: nodeEnv == 'development' || nodeEnv === 'testing',
	}

	db_ = require('knex')(dbConfig_);

	await migrate(db_);
}

export async function destroyDb() {
	await db().destroy();

	const dbFilePath = dbConfig_?.connection?.filename;
	
	dbConfig_ = null;
	db_ = null;

	if (dbFilePath) await fs.remove(dbFilePath);
}

export default function db():Knex {
	if (!db_) throw new Error('Trying to access DB before it has been initialized')
	return db_;
}

export async function migrate(db:Knex) {
	const config = {
		directory: `${packageRootDir}/dist/migrations`,
		// Disable transactions because the models might open one too
		disableTransactions: true,
	};
	
	await db.migrate.latest(config);
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
