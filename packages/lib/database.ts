import Logger from '@joplin/utils/Logger';
import time from './time';
import shim from './shim';
import { SqlParams, SqlQuery, StringOrSqlQuery } from './services/database/types';

const Mutex = require('async-mutex').Mutex;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export type Row = Record<string, any>;

export default class Database {

	public static TYPE_UNKNOWN = 0;
	public static TYPE_INT = 1;
	public static TYPE_TEXT = 2;
	public static TYPE_NUMERIC = 3;

	protected debugMode_ = false;
	private sqlQueryLogEnabled_ = false;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private driver_: any;
	private logger_ = new Logger();
	private logExcludedQueryTypes_: string[] = [];
	private batchTransactionMutex_ = new Mutex();
	private profilingEnabled_ = false;
	private queryId_ = 1;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public constructor(driver: any) {
		this.driver_ = driver;
	}

	public setLogExcludedQueryTypes(v: string[]) {
		this.logExcludedQueryTypes_ = v;
	}

	// Converts the SQLite error to a regular JS error
	// so that it prints a stacktrace when passed to
	// console.error()
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public sqliteErrorToJsError(error: any, sql: string = null, params: SqlParams = null) {
		return this.driver().sqliteErrorToJsError(error, sql, params);
	}

	public setLogger(l: Logger) {
		this.logger_ = l;
	}

	public logger() {
		return this.logger_;
	}

	public driver() {
		return this.driver_;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async open(options: any) {
		try {
			await this.driver().open(options);
		} catch (error) {
			throw new Error(`Cannot open database: ${error.message ?? error}: ${JSON.stringify(options)}`);
		}

		this.logger().info('Database was open successfully');
	}

	public escapeField(field: string) {
		if (field === '*') return '*';
		const p = field.split('.');
		if (p.length === 1) return `\`${field}\``;
		if (p.length === 2) return `${p[0]}.\`${p[1]}\``;

		throw new Error(`Invalid field format: ${field}`);
	}

	public escapeFields(fields: string[] | string): string[] | string {
		if (fields === '*') return '*';

		const output = [];
		for (let i = 0; i < fields.length; i++) {
			output.push(this.escapeField(fields[i]));
		}
		return output;
	}

	public escapeValues(values: string[]) {
		return values.map(value => {
			// See https://www.sqlite.org/printf.html#percentq
			return `'${value.replace(/[']/g, '\'\'')}'`;
		});
	}

	public escapeFieldsToString(fields: string[] | string): string {
		if (typeof fields === 'string') {
			if (fields === '*') return '*';
			throw new Error(`Invalid field value (only "*" is supported): ${fields}`);
		}

		const output = [];
		for (let i = 0; i < fields.length; i++) {
			output.push(this.escapeField(fields[i]));
		}
		return output.join(',');
	}

	public async tryCall(callName: string, inputSql: StringOrSqlQuery, inputParams: SqlParams) {
		let sql: string = null;
		let params: SqlParams = null;

		if (typeof inputSql === 'object') {
			params = (inputSql as SqlQuery).params;
			sql = (inputSql as SqlQuery).sql;
		} else {
			params = inputParams;
			sql = inputSql as string;
		}

		let waitTime = 50;
		let totalWaitTime = 0;
		const callStartTime = Date.now();
		let profilingTimeoutId = null;
		while (true) {
			try {
				this.logQuery(sql, params);

				const queryId = this.queryId_++;
				if (this.profilingEnabled_) {
					// eslint-disable-next-line no-console
					console.info(`SQL START ${queryId}`, sql, params);

					profilingTimeoutId = shim.setInterval(() => {
						console.warn(`SQL ${queryId} has been running for ${Date.now() - callStartTime}: ${sql}`);
					}, 3000);
				}

				const result = await this.driver()[callName](sql, params);

				if (this.profilingEnabled_) {
					shim.clearInterval(profilingTimeoutId);
					profilingTimeoutId = null;
					const elapsed = Date.now() - callStartTime;
					// eslint-disable-next-line no-console
					if (elapsed > 10) console.info(`SQL END ${queryId}`, elapsed, sql, params);
				}

				return result; // No exception was thrown
			} catch (error) {
				if (error && (error.code === 'SQLITE_IOERR' || error.code === 'SQLITE_BUSY')) {
					if (totalWaitTime >= 20000) throw this.sqliteErrorToJsError(error, sql, params);
					// NOTE: don't put logger statements here because it might log to the database, which
					// could result in an error being thrown again.
					// this.logger().warn(sprintf('Error %s: will retry in %s milliseconds', error.code, waitTime));
					// this.logger().warn('Error was: ' + error.toString());
					await time.msleep(waitTime);
					totalWaitTime += waitTime;
					waitTime *= 1.5;
				} else {
					throw this.sqliteErrorToJsError(error, sql, params);
				}
			} finally {
				if (profilingTimeoutId) shim.clearInterval(profilingTimeoutId);
			}
		}
	}

	public async selectOne(sql: string, params: SqlParams = null): Promise<Row> {
		return this.tryCall('selectOne', sql, params);
	}

	public async loadExtension(/* path */) {
		return; // Disabled for now as fuzzy search extension is not in use

		// let result =  null;
		// try {
		// 	result = await this.driver().loadExtension(path);
		// 	return result;
		// } catch (e) {
		// 	throw new Error(`Could not load extension ${path}`);
		// }
	}

	public async selectAll<T = Row>(sql: string, params: SqlParams = null): Promise<T[]> {
		return this.tryCall('selectAll', sql, params);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async selectAllFields(sql: string, params: SqlParams, field: string): Promise<any[]> {
		const rows = await this.tryCall('selectAll', sql, params);
		const output = [];
		for (let i = 0; i < rows.length; i++) {
			const v = rows[i][field];
			if (!v) throw new Error(`No such field: ${field}. Query was: ${sql}`);
			output.push(rows[i][field]);
		}
		return output;
	}

	public async exec(sql: StringOrSqlQuery, params: SqlParams = null) {
		return this.tryCall('exec', sql, params);
	}

	public async transactionExecBatch(queries: StringOrSqlQuery[]) {
		if (queries.length <= 0) return;

		if (queries.length === 1) {
			const q = this.wrapQuery(queries[0]);
			await this.exec(q.sql, q.params);
			return;
		}

		// There can be only one transaction running at a time so use a	mutex
		const release = await this.batchTransactionMutex_.acquire();

		try {
			await this.exec('BEGIN TRANSACTION');

			for (let i = 0; i < queries.length; i++) {
				const query = this.wrapQuery(queries[i]);
				await this.exec(query.sql, query.params);
			}

			await this.exec('COMMIT');
		} catch (error) {
			await this.exec('ROLLBACK');
			throw error;
		} finally {
			release();
		}
	}

	public static enumId(type: string, s: string) {
		if (type === 'settings') {
			if (s === 'int') return 1;
			if (s === 'string') return 2;
		}
		if (type === 'fieldType') {
			if (s) s = s.toUpperCase();
			if (s === 'INTEGER') s = 'INT';
			if (!(`TYPE_${s}` in this)) throw new Error(`Unknown fieldType: ${s}`);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			return (this as any)[`TYPE_${s}`];
		}
		if (type === 'syncTarget') {
			if (s === 'memory') return 1;
			if (s === 'filesystem') return 2;
			if (s === 'onedrive') return 3;
		}
		throw new Error(`Unknown enum type or value: ${type}, ${s}`);
	}

	public static enumName(type: string, id: number) {
		if (type === 'fieldType') {
			if (id === Database.TYPE_UNKNOWN) return 'unknown';
			if (id === Database.TYPE_INT) return 'int';
			if (id === Database.TYPE_TEXT) return 'text';
			if (id === Database.TYPE_NUMERIC) return 'numeric';
			throw new Error(`Invalid type id: ${id}`);
		}

		// Or maybe an error should be thrown
		return undefined;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static formatValue(type: number, value: any) {
		if (value === null || value === undefined) return null;
		if (type === this.TYPE_INT) return Number(value);
		if (type === this.TYPE_TEXT) return value;
		if (type === this.TYPE_NUMERIC) return Number(value);
		throw new Error(`Unknown type: ${type}`);
	}

	public logQuery(sql: string, params: SqlParams = null) {
		if (!this.sqlQueryLogEnabled_) return;

		if (this.logExcludedQueryTypes_.length) {
			const temp = sql.toLowerCase();
			for (let i = 0; i < this.logExcludedQueryTypes_.length; i++) {
				if (temp.indexOf(this.logExcludedQueryTypes_[i].toLowerCase()) === 0) return;
			}
		}

		this.logger().debug(sql);
		if (params !== null && params.length) this.logger().debug(JSON.stringify(params));
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static insertQuery(tableName: string, data: Record<string, any>) {
		if (!data || !Object.keys(data).length) throw new Error('Data is empty');

		let keySql = '';
		let valueSql = '';
		const params = [];
		for (const key in data) {
			if (!data.hasOwnProperty(key)) continue;
			if (key[key.length - 1] === '_') continue;
			if (keySql !== '') keySql += ', ';
			if (valueSql !== '') valueSql += ', ';
			keySql += `\`${key}\``;
			valueSql += '?';
			params.push(data[key]);
		}
		return {
			sql: `INSERT INTO \`${tableName}\` (${keySql}) VALUES (${valueSql})`,
			params: params,
		};
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static updateQuery(tableName: string, data: Record<string, any>, where: string | Record<string, any>) {
		if (!data || !Object.keys(data).length) throw new Error('Data is empty');

		let sql = '';
		const params = [];
		for (const key in data) {
			if (!data.hasOwnProperty(key)) continue;
			if (key[key.length - 1] === '_') continue;
			if (sql !== '') sql += ', ';
			sql += `\`${key}\`=?`;
			params.push(data[key]);
		}

		if (typeof where !== 'string') {
			const s = [];
			for (const n in where) {
				if (!where.hasOwnProperty(n)) continue;
				params.push(where[n]);
				s.push(`\`${n}\`=?`);
			}
			where = s.join(' AND ');
		}

		return {
			sql: `UPDATE \`${tableName}\` SET ${sql} WHERE ${where}`,
			params: params,
		};
	}

	public alterColumnQueries(tableName: string, fields: Record<string, string>) {
		const fieldsNoType = [];
		for (const n in fields) {
			if (!fields.hasOwnProperty(n)) continue;
			fieldsNoType.push(n);
		}

		const fieldsWithType = [];
		for (const n in fields) {
			if (!fields.hasOwnProperty(n)) continue;
			fieldsWithType.push(`${this.escapeField(n)} ${fields[n]}`);
		}

		let sql = `
			CREATE TEMPORARY TABLE _BACKUP_TABLE_NAME_(_FIELDS_TYPE_);
			INSERT INTO _BACKUP_TABLE_NAME_ SELECT _FIELDS_NO_TYPE_ FROM _TABLE_NAME_;
			DROP TABLE _TABLE_NAME_;
			CREATE TABLE _TABLE_NAME_(_FIELDS_TYPE_);
			INSERT INTO _TABLE_NAME_ SELECT _FIELDS_NO_TYPE_ FROM _BACKUP_TABLE_NAME_;
			DROP TABLE _BACKUP_TABLE_NAME_;
		`;

		sql = sql.replace(/_BACKUP_TABLE_NAME_/g, this.escapeField(`${tableName}_backup`));
		sql = sql.replace(/_TABLE_NAME_/g, this.escapeField(tableName));
		sql = sql.replace(/_FIELDS_NO_TYPE_/g, (this.escapeFields(fieldsNoType) as string[]).join(','));
		sql = sql.replace(/_FIELDS_TYPE_/g, fieldsWithType.join(','));

		return sql.trim().split('\n');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public wrapQueries(queries: any[]) {
		const output = [];
		for (let i = 0; i < queries.length; i++) {
			output.push(this.wrapQuery(queries[i]));
		}
		return output;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public wrapQuery(sql: any, params: SqlParams = null): SqlQuery {
		if (!sql) throw new Error(`Cannot wrap empty string: ${sql}`);

		if (Array.isArray(sql)) {
			return {
				sql: sql[0],
				params: sql.length >= 2 ? sql[1] : null,
			};
		} else if (typeof sql === 'string') {
			return { sql: sql, params: params };
		} else {
			return sql; // Already wrapped
		}
	}
}
