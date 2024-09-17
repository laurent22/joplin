import { knex, Knex } from 'knex';
import { DatabaseConfig, DatabaseConfigClient } from './utils/types';
import * as pathUtils from 'path';
import time from '@joplin/lib/time';
import Logger from '@joplin/utils/Logger';
import { databaseSchema } from './services/database/types';
import { compareVersions } from 'compare-versions';
import { copyFile } from 'fs-extra';

// Make sure bigInteger values are numbers and not strings
//
// https://github.com/brianc/node-pg-types
//
// In our case, all bigInteger are timestamps, which JavaScript can handle
// fine as numbers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
require('pg').types.setTypeParser(20, (val: any) => {
	return parseInt(val, 10);
});

// Also need this to get integers for count() queries.
// https://knexjs.org/#Builder-count
declare module 'knex/types/result' {
	interface Registry {
		Count: number;
	}
}

const logger = Logger.create('db');

// To prevent error "SQLITE_ERROR: too many SQL variables", SQL statements with
// "IN" clauses shouldn't contain more than the number of variables below.s
// https://www.sqlite.org/limits.html#max_variable_number
export const SqliteMaxVariableNum = 999;

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
	connectionString?: string;
}

export interface QueryContext {
	uniqueConstraintErrorLoggingDisabled?: boolean;
	noSuchTableErrorLoggingDisabled?: boolean;
}

export interface KnexDatabaseConfig {
	client: string;
	connection: DbConfigConnection;
	useNullAsDefault?: boolean;
	asyncStackTraces?: boolean;
}

export interface ConnectionCheckResult {
	isCreated: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	error: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	latestMigration: any;
	connection: DbConnection;
}

export interface Migration {
	name: string;
	done: boolean;
}

export function makeKnexConfig(dbConfig: DatabaseConfig): KnexDatabaseConfig {
	const connection: DbConfigConnection = {};

	if (dbConfig.client === 'sqlite3') {
		connection.filename = dbConfig.name;
	} else {
		if (dbConfig.connectionString) {
			connection.connectionString = dbConfig.connectionString;
		} else {
			connection.database = dbConfig.name;
			connection.host = dbConfig.host;
			connection.port = dbConfig.port;
			connection.user = dbConfig.user;
			connection.password = dbConfig.password;
		}
	}

	return {
		client: dbConfig.client,
		useNullAsDefault: dbConfig.client === 'sqlite3',
		asyncStackTraces: dbConfig.asyncStackTraces,
		connection,
	};
}

export async function waitForConnection(masterConfig: DatabaseConfig): Promise<ConnectionCheckResult> {
	const timeout = 30000;
	const startTime = Date.now();
	let lastError = { message: '' };

	while (true) {
		try {
			const connection = await connectDb(masterConfig);
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

export const clientType = (db: DbConnection): DatabaseConfigClient => {
	return db.client.config.client;
};

export const returningSupported = (db: DbConnection) => {
	return clientType(db) === DatabaseConfigClient.PostgreSQL;
};

export const isPostgres = (db: DbConnection) => {
	return clientType(db) === DatabaseConfigClient.PostgreSQL;
};

export const isSqlite = (db: DbConnection) => {
	return clientType(db) === DatabaseConfigClient.SQLite;
};

export const setCollateC = async (db: DbConnection, tableName: string, columnName: string): Promise<void> => {
	if (!isPostgres(db)) return;
	await db.raw(`ALTER TABLE ${tableName} ALTER COLUMN ${columnName} SET DATA TYPE character varying(32) COLLATE "C"`);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function makeSlowQueryHandler(duration: number, connection: any, sql: string, bindings: any[]) {
	return setTimeout(() => {
		try {
			logger.warn(`Slow query (${duration}ms+):`, connection.raw(sql, bindings).toString());
		} catch (error) {
			logger.error('Could not log slow query', { sql, bindings }, error);
		}
	}, duration);
}

export function setupSlowQueryLog(connection: DbConnection, slowQueryLogMinDuration: number) {
	interface QueryInfo {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		timeoutId: any;
		startTime: number;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const queryInfos: Record<any, QueryInfo> = {};

	// These queries do not return a response, so "query-response" is not
	// called.
	const ignoredQueries = /^BEGIN|SAVEPOINT|RELEASE SAVEPOINT|COMMIT|ROLLBACK/gi;

	connection.on('query', (data) => {
		const sql: string = data.sql;

		if (!sql || sql.match(ignoredQueries)) return;

		const timeoutId = makeSlowQueryHandler(slowQueryLogMinDuration, connection, sql, data.bindings);

		queryInfos[data.__knexQueryUid] = {
			timeoutId,
			startTime: Date.now(),
		};
	});

	connection.on('query-response', (_response, data) => {
		const q = queryInfos[data.__knexQueryUid];
		if (q) {
			clearTimeout(q.timeoutId);
			delete queryInfos[data.__knexQueryUid];
		}
	});

	connection.on('query-error', (_response, data) => {
		const q = queryInfos[data.__knexQueryUid];
		if (q) {
			clearTimeout(q.timeoutId);
			delete queryInfos[data.__knexQueryUid];
		}
	});
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const filterBindings = (bindings: any[]): Record<string, any> => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const output: Record<string, any> = {};

	for (let i = 0; i < bindings.length; i++) {
		let value = bindings[i];
		if (typeof value === 'string') value = value.substr(0, 200);
		if (Buffer.isBuffer(value)) value = '<binary>';
		output[`$${i + 1}`] = value;
	}

	return output;
};

interface KnexQueryErrorResponse {
	message: string;
}

interface KnexQueryErrorData {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	bindings: any[];
	queryContext: QueryContext;
}

const dbConnectionConfigs_: Map<DbConnection, DatabaseConfig> = new Map();

export async function connectDb(dbConfig: DatabaseConfig): Promise<DbConnection> {
	const connection = knex(makeKnexConfig(dbConfig));

	if (dbConfig.slowQueryLogEnabled) {
		setupSlowQueryLog(connection, dbConfig.slowQueryLogMinDuration);
	}

	connection.on('query-error', (response: KnexQueryErrorResponse, data: KnexQueryErrorData) => {
		// It is possible to set certain properties on the query context to
		// disable this handler. This is useful for example for constraint
		// errors which are often already handled application side.

		if (data.queryContext) {
			if (data.queryContext.uniqueConstraintErrorLoggingDisabled && isUniqueConstraintError(response)) {
				return;
			}

			if (data.queryContext.noSuchTableErrorLoggingDisabled && isNoSuchTableError(response)) {
				return;
			}
		}

		const msg: string[] = [];
		msg.push(response.message);
		if (data.bindings && data.bindings.length) msg.push(JSON.stringify(filterBindings(data.bindings), null, '  '));
		logger.error(...msg);
	});

	dbConnectionConfigs_.set(connection, dbConfig);

	return connection;
}

export const reconnectDb = async (db: DbConnection) => {
	const dbConfig = dbConnectionConfigs_.get(db);

	await disconnectDb(db);

	await db.initialize(makeKnexConfig(dbConfig));
};

export async function disconnectDb(db: DbConnection) {
	await db.destroy();
}

// This is used in tests to simulate replication in a controlled way. It allows testing how the
// server behaves when part of the data is stale.
export const sqliteSyncSlave = async (master: DbConnection, slave: DbConnection) => {
	const masterConfig = dbConnectionConfigs_.get(master);
	const slaveConfig = dbConnectionConfigs_.get(slave);
	await disconnectDb(master);
	await disconnectDb(slave);
	await copyFile(masterConfig.name, slaveConfig.name);
	await reconnectDb(master);
	await reconnectDb(slave);
};

export async function migrateLatest(db: DbConnection, disableTransactions = false) {
	await db.migrate.latest({
		directory: migrationDir,
		disableTransactions,
	});
}

export async function migrateUp(db: DbConnection, disableTransactions = false) {
	await db.migrate.up({
		directory: migrationDir,
		disableTransactions,
	});
}

export async function migrateDown(db: DbConnection, disableTransactions = false) {
	await db.migrate.down({
		directory: migrationDir,
		disableTransactions,
	});
}

export async function migrateUnlock(db: DbConnection) {
	await db.migrate.forceFreeMigrationsLock();
}

export async function migrateList(db: DbConnection, asString = true) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const migrations: any = await db.migrate.list({
		directory: migrationDir,
	});

	// The migration array has a rather inconsistent format:
	//
	// [
	//   // Done migrations
	//   [
	//     '20210809222118_email_key_fix.js',
	//     '20210814123815_testing.js',
	//     '20210814123816_testing.js'
	//   ],
	//   // Not done migrations
	//   [
	//     {
	//       file: '20210814123817_testing.js',
	//       directory: '/path/to/packages/server/dist/migrations'
	//     }
	//   ]
	// ]

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const getMigrationName = (migrationInfo: any) => {
		if (migrationInfo && migrationInfo.name) return migrationInfo.name;
		if (migrationInfo && migrationInfo.file) return migrationInfo.file;
		return migrationInfo;
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const formatName = (migrationInfo: any) => {
		const s = getMigrationName(migrationInfo).split('.');
		s.pop();
		return s.join('.');
	};

	const output: Migration[] = [];

	for (const s of migrations[0]) {
		output.push({
			name: formatName(s),
			done: true,
		});
	}

	for (const s of migrations[1]) {
		output.push({
			name: formatName(s),
			done: false,
		});
	}

	output.sort((a, b) => {
		return a.name < b.name ? -1 : +1;
	});

	if (!asString) return output;

	return output.map(l => `${l.done ? '✓' : '✗'} ${l.name}`).join('\n');
}

export const needsMigration = async (db: DbConnection) => {
	const list = await migrateList(db, false) as Migration[];
	return !!list.find(m => !m.done);
};

export async function nextMigration(db: DbConnection): Promise<string> {
	const list = await migrateList(db, false) as Migration[];

	let nextMigration: Migration = null;

	while (list.length) {
		const migration = list.pop();
		if (migration.done) return nextMigration ? nextMigration.name : '';
		nextMigration = migration;
	}

	return '';
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

export async function truncateTables(db: DbConnection, includedTables: string[] = []): Promise<void> {
	for (const tableName of allTableNames()) {
		if (includedTables.length && !includedTables.includes(tableName)) continue;

		try {
			await db(tableName).truncate();
		} catch (error) {
			if (isNoSuchTableError(error)) continue;
			throw error;
		}
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function isNoSuchTableError(error: any): boolean {
	if (error) {
		// Postgres error: 42P01: undefined_table
		if (error.code === '42P01') return true;

		// Sqlite3 error
		if (error.message && error.message.includes('SQLITE_ERROR: no such table:')) return true;
	}

	return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export function isUniqueConstraintError(error: any): boolean {
	if (error) {
		// Postgres error: 23505: unique_violation
		if (error.code === '23505') return true;

		// Sqlite3 error
		if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('UNIQUE constraint')) return true;
	}

	return false;
}

const parsePostgresVersionString = (versionString: string) => {
	// PostgreSQL 16.1 (Debian 16.1-1.pgdg120+1) on x86_64-pc-linux-gnu, compiled by gcc (Debian 12.2.0-14) 12.2.0, 64-bit
	const matches = versionString.match('PostgreSQL (.*?) ');
	if (!matches || matches.length !== 2) throw new Error(`Cannot parse Postgres version string: ${versionString}`);
	return matches[1];
};

export const versionCheck = async (db: DbConnection) => {
	if (isPostgres(db)) {
		// We only support Postgres v12+
		// https://github.com/laurent22/joplin/issues/9695
		// https://www.postgresql.org/docs/current/rules-materializedviews.html
		const minPostgresVersion = '12.0';
		const result = await db.select(db.raw('version()')).first();
		if (result && result.version) {
			const version = parsePostgresVersionString(result.version);
			if (compareVersions(version, minPostgresVersion) < 0) throw new Error(`Postgres version not supported: ${result.version}. Min required version is: ${minPostgresVersion}`);
		} else {
			throw new Error(`Could not fetch Postgres version info. Got: ${JSON.stringify(result)}`);
		}
	} else {
		// Not implemented
	}
};

export async function latestMigration(db: DbConnection): Promise<Migration | null> {
	try {
		const context: QueryContext = { noSuchTableErrorLoggingDisabled: true };
		const result = await db('knex_migrations').queryContext(context).select('name').orderBy('id', 'desc').first();
		return { name: result.name, done: true };
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
