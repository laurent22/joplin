import { knex, Knex } from 'knex';
import { DatabaseConfig } from './utils/types';
import * as pathUtils from 'path';
import time from '@joplin/lib/time';
import Logger from '@joplin/lib/Logger';

// Make sure bigInteger values are numbers and not strings
//
// https://github.com/brianc/node-pg-types
//
// In our case, all bigInteger are timestamps, which JavaScript can handle
// fine as numbers.
require('pg').types.setTypeParser(20, function(val: any) {
	return parseInt(val, 10);
});

const logger = Logger.create('db');

const migrationDir = `${__dirname}/migrations`;
export const sqliteDefaultDir = pathUtils.dirname(__dirname);

export const defaultAdminEmail = 'admin@localhost';
export const defaultAdminPassword = 'admin';

export type DbConnection = Knex;

export interface DbConfigConnection {
	host?: string;
	port?: number;
	user?: string;
	database?: string;
	filename?: string;
	password?: string;
}

export interface KnexDatabaseConfig {
	client: string;
	connection: DbConfigConnection;
	useNullAsDefault?: boolean;
	asyncStackTraces?: boolean;
}

export interface ConnectionCheckResult {
	isCreated: boolean;
	error: any;
	latestMigration: any;
	connection: DbConnection;
}

export function makeKnexConfig(dbConfig: DatabaseConfig): KnexDatabaseConfig {
	const connection: DbConfigConnection = {};

	if (dbConfig.client === 'sqlite3') {
		connection.filename = dbConfig.name;
	} else {
		connection.database = dbConfig.name;
		connection.host = dbConfig.host;
		connection.port = dbConfig.port;
		connection.user = dbConfig.user;
		connection.password = dbConfig.password;
	}

	return {
		client: dbConfig.client,
		useNullAsDefault: dbConfig.client === 'sqlite3',
		asyncStackTraces: dbConfig.asyncStackTraces,
		connection,
	};
}

export async function waitForConnection(dbConfig: DatabaseConfig): Promise<ConnectionCheckResult> {
	const timeout = 30000;
	const startTime = Date.now();
	let lastError = { message: '' };

	while (true) {
		try {
			const connection = await connectDb(dbConfig);
			const check = await connectionCheck(connection);
			if (check.error) throw check.error;
			return check;
		} catch (error) {
			logger.info('Could not connect. Will try again.', error.message);
			lastError = error;
		}

		if (Date.now() - startTime > timeout) {
			logger.error('Timeout trying to connect to database:', lastError);
			throw new Error(`Timeout trying to connect to database. Last error was: ${lastError.message}`);
		}

		await time.msleep(1000);
	}
}

export async function connectDb(dbConfig: DatabaseConfig): Promise<DbConnection> {
	const connection = knex(makeKnexConfig(dbConfig));

	const debugSlowQueries = false;

	if (debugSlowQueries) {
		const startTimes: Record<string, number> = {};

		const slowQueryDuration = 10;

		connection.on('query', (data) => {
			startTimes[data.__knexQueryUid] = Date.now();
		});

		connection.on('query-response', (_response, data) => {
			const duration = Date.now() - startTimes[data.__knexQueryUid];
			if (duration < slowQueryDuration) return;
			console.info(`SQL: ${data.sql} (${duration}ms)`);
		});
	}

	return connection;
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

function allTableNames(): string[] {
	const tableNames = Object.keys(databaseSchema);
	tableNames.push('knex_migrations');
	tableNames.push('knex_migrations_lock');
	return tableNames;
}

export async function dropTables(db: DbConnection): Promise<void> {
	for (const tableName of allTableNames()) {
		try {
			await db.schema.dropTable(tableName);
		} catch (error) {
			if (isNoSuchTableError(error)) continue;
			throw error;
		}
	}
}

export async function truncateTables(db: DbConnection): Promise<void> {
	for (const tableName of allTableNames()) {
		try {
			await db(tableName).truncate();
		} catch (error) {
			if (isNoSuchTableError(error)) continue;
			throw error;
		}
	}
}

function isNoSuchTableError(error: any): boolean {
	if (error) {
		// Postgres error: 42P01: undefined_table
		if (error.code === '42P01') return true;

		// Sqlite3 error
		if (error.message && error.message.includes('SQLITE_ERROR: no such table:')) return true;
	}

	return false;
}

export function isUniqueConstraintError(error: any): boolean {
	if (error) {
		// Postgres error: 23505: unique_violation
		if (error.code === '23505') return true;

		// Sqlite3 error
		if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('UNIQUE constraint')) return true;
	}

	return false;
}

export async function latestMigration(db: DbConnection): Promise<any> {
	try {
		const result = await db('knex_migrations').select('name').orderBy('id', 'asc').first();
		return result;
	} catch (error) {
		// If the database has never been initialized, we return null, so
		// for this we need to check the error code, which will be
		// different depending on the DBMS.

		if (isNoSuchTableError(error)) return null;

		throw error;
	}
}

export async function connectionCheck(db: DbConnection): Promise<ConnectionCheckResult> {
	try {
		const result = await latestMigration(db);
		return {
			latestMigration: result,
			isCreated: !!result,
			error: null,
			connection: db,
		};
	} catch (error) {
		return {
			latestMigration: null,
			isCreated: false,
			error: error,
			connection: null,
		};
	}
}

export type Uuid = string;

export enum ItemAddressingType {
	Id = 1,
	Path,
}

export enum NotificationLevel {
	Important = 10,
	Normal = 20,
}

export enum ItemType {
    Item = 1,
	UserItem = 2,
	User,
}

export enum EmailSender {
	NoReply = 1,
	Support = 2,
}

export enum ChangeType {
	Create = 1,
	Update = 2,
	Delete = 3,
}

export enum FileContentType {
	Any = 1,
	JoplinItem = 2,
}

export function changeTypeToString(t: ChangeType): string {
	if (t === ChangeType.Create) return 'create';
	if (t === ChangeType.Update) return 'update';
	if (t === ChangeType.Delete) return 'delete';
	throw new Error(`Unkown type: ${t}`);
}

export enum ShareType {
	Note = 1, // When a note is shared via a public link
	Folder = 3, // When a complete folder is shared with another Joplin Server user
}

export enum ShareUserStatus {
	Waiting = 0,
	Accepted = 1,
	Rejected = 2,
}

export interface WithDates {
	updated_time?: number;
	created_time?: number;
}

export interface WithUuid {
	id?: Uuid;
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
export interface Session extends WithDates, WithUuid {
	user_id?: Uuid;
	auth_code?: string;
}

export interface File {
	id?: Uuid;
	owner_id?: Uuid;
	name?: string;
	content?: any;
	mime_type?: string;
	size?: number;
	is_directory?: number;
	is_root?: number;
	parent_id?: Uuid;
	updated_time?: string;
	created_time?: string;
	source_file_id?: Uuid;
	content_type?: number;
	content_id?: Uuid;
}

export interface ApiClient extends WithDates, WithUuid {
	name?: string;
	secret?: string;
}

export interface Notification extends WithDates, WithUuid {
	owner_id?: Uuid;
	level?: NotificationLevel;
	key?: string;
	message?: string;
	read?: number;
	canBeDismissed?: number;
}

export interface ShareUser extends WithDates, WithUuid {
	share_id?: Uuid;
	user_id?: Uuid;
	status?: ShareUserStatus;
}

export interface Item extends WithDates, WithUuid {
	name?: string;
	mime_type?: string;
	content?: Buffer;
	content_size?: number;
	jop_id?: Uuid;
	jop_parent_id?: Uuid;
	jop_share_id?: Uuid;
	jop_type?: number;
	jop_encryption_applied?: number;
	jop_updated_time?: number;
}

export interface UserItem extends WithDates {
	id?: number;
	user_id?: Uuid;
	item_id?: Uuid;
}

export interface ItemResource {
	id?: number;
	item_id?: Uuid;
	resource_id?: Uuid;
}

export interface KeyValue {
	id?: number;
	key?: string;
	type?: number;
	value?: string;
}

export interface Share extends WithDates, WithUuid {
	owner_id?: Uuid;
	item_id?: Uuid;
	type?: ShareType;
	folder_id?: Uuid;
	note_id?: Uuid;
}

export interface Change extends WithDates, WithUuid {
	counter?: number;
	item_type?: ItemType;
	item_id?: Uuid;
	item_name?: string;
	type?: ChangeType;
	previous_item?: string;
	user_id?: Uuid;
}

export interface Email extends WithDates {
	id?: number;
	recipient_name?: string;
	recipient_email?: string;
	recipient_id?: Uuid;
	sender_id?: EmailSender;
	subject?: string;
	body?: string;
	sent_time?: number;
	sent_success?: number;
	error?: string;
}

export interface Token extends WithDates {
	id?: number;
	value?: string;
	user_id?: Uuid;
}

export interface Subscription {
	id?: number;
	user_id?: Uuid;
	stripe_user_id?: Uuid;
	stripe_subscription_id?: Uuid;
	last_payment_time?: number;
	last_payment_failed_time?: number;
	updated_time?: string;
	created_time?: string;
}

export interface User extends WithDates, WithUuid {
	email?: string;
	password?: string;
	full_name?: string;
	is_admin?: number;
	email_confirmed?: number;
	must_set_password?: number;
	account_type?: number;
	can_upload?: number;
	max_item_size?: number | null;
	can_share_folder?: number | null;
	can_share_note?: number | null;
	max_total_item_size?: number | null;
	total_item_size?: number;
}

export const databaseSchema: DatabaseTables = {
	sessions: {
		id: { type: 'string' },
		user_id: { type: 'string' },
		auth_code: { type: 'string' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
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
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
		source_file_id: { type: 'string' },
		content_type: { type: 'number' },
		content_id: { type: 'string' },
	},
	api_clients: {
		id: { type: 'string' },
		name: { type: 'string' },
		secret: { type: 'string' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
	},
	notifications: {
		id: { type: 'string' },
		owner_id: { type: 'string' },
		level: { type: 'number' },
		key: { type: 'string' },
		message: { type: 'string' },
		read: { type: 'number' },
		canBeDismissed: { type: 'number' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
	},
	share_users: {
		id: { type: 'string' },
		share_id: { type: 'string' },
		user_id: { type: 'string' },
		status: { type: 'number' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
	},
	items: {
		id: { type: 'string' },
		name: { type: 'string' },
		mime_type: { type: 'string' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
		content: { type: 'any' },
		content_size: { type: 'number' },
		jop_id: { type: 'string' },
		jop_parent_id: { type: 'string' },
		jop_share_id: { type: 'string' },
		jop_type: { type: 'number' },
		jop_encryption_applied: { type: 'number' },
		jop_updated_time: { type: 'string' },
	},
	user_items: {
		id: { type: 'number' },
		user_id: { type: 'string' },
		item_id: { type: 'string' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
	},
	item_resources: {
		id: { type: 'number' },
		item_id: { type: 'string' },
		resource_id: { type: 'string' },
	},
	key_values: {
		id: { type: 'number' },
		key: { type: 'string' },
		type: { type: 'number' },
		value: { type: 'string' },
	},
	shares: {
		id: { type: 'string' },
		owner_id: { type: 'string' },
		item_id: { type: 'string' },
		type: { type: 'number' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
		folder_id: { type: 'string' },
		note_id: { type: 'string' },
	},
	changes: {
		counter: { type: 'number' },
		id: { type: 'string' },
		item_type: { type: 'number' },
		item_id: { type: 'string' },
		item_name: { type: 'string' },
		type: { type: 'number' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
		previous_item: { type: 'string' },
		user_id: { type: 'string' },
	},
	emails: {
		id: { type: 'number' },
		recipient_name: { type: 'string' },
		recipient_email: { type: 'string' },
		recipient_id: { type: 'string' },
		sender_id: { type: 'number' },
		subject: { type: 'string' },
		body: { type: 'string' },
		sent_time: { type: 'string' },
		sent_success: { type: 'number' },
		error: { type: 'string' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
	},
	tokens: {
		id: { type: 'number' },
		value: { type: 'string' },
		user_id: { type: 'string' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
	},
	subscriptions: {
		id: { type: 'number' },
		user_id: { type: 'string' },
		stripe_user_id: { type: 'string' },
		stripe_subscription_id: { type: 'string' },
		last_payment_time: { type: 'string' },
		last_payment_failed_time: { type: 'string' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
	},
	users: {
		id: { type: 'string' },
		email: { type: 'string' },
		password: { type: 'string' },
		full_name: { type: 'string' },
		is_admin: { type: 'number' },
		updated_time: { type: 'string' },
		created_time: { type: 'string' },
		email_confirmed: { type: 'number' },
		must_set_password: { type: 'number' },
		account_type: { type: 'number' },
		can_upload: { type: 'number' },
		max_item_size: { type: 'number' },
		can_share_folder: { type: 'number' },
		can_share_note: { type: 'number' },
		max_total_item_size: { type: 'string' },
		total_item_size: { type: 'string' },
	},
};
// AUTO-GENERATED-TYPES
