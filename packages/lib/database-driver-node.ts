import shim from './shim';
import { SqlParams } from './services/database/types';

interface SqliteDatabase {
	close(cb: ()=> void): void;
	get(sql: string, params: SqlParams | Record<string, unknown>, cb: (error: Error | null, row: unknown)=> void): void;
	all(sql: string, params: SqlParams | Record<string, unknown>, cb: (error: Error | null, rows: unknown)=> void): void;
	run(sql: string, params: SqlParams | Record<string, unknown>, cb: (error: Error | null)=> void): void;
	loadExtension(path: string, cb: (error: Error | null)=> void): void;
}

interface ErrorWithCode extends Error {
	code?: string;
}

// eslint-disable-next-line import/prefer-default-export -- preserves the destructured `{ DatabaseDriverNode }` import shape used by multiple callers
export class DatabaseDriverNode {
	private db_: SqliteDatabase | null = null;

	public open(options: { name: string }) {
		return new Promise<void>((resolve, reject) => {
			const sqlite3 = shim.nodeSqlite().verbose();

			this.db_ = new sqlite3.Database(options.name, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (error: Error | null) => {
				if (error) {
					reject(error);
					return;
				}
				resolve();
			});
		});
	}

	public close() {
		return new Promise<void>(resolve => {
			this.db_.close(() => resolve());
		});
	}

	public sqliteErrorToJsError(error: ErrorWithCode, sql: string | null = null, params: SqlParams | null = null) {
		const msg: unknown[] = [error.toString()];
		if (sql) msg.push(sql);
		if (params) msg.push(params);
		const output: ErrorWithCode = new Error(msg.join(': '));
		if (error.code) output.code = error.code;
		return output;
	}

	public selectOne(sql: string, params: SqlParams | null = null) {
		const queryParams = params ?? {};
		return new Promise((resolve, reject) => {
			this.db_.get(sql, queryParams, (error, row) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(row);
			});
		});
	}

	public loadExtension(path: string) {
		return new Promise<void>((resolve, reject) => {
			this.db_.loadExtension(path, (error) => {
				if (error) {
					reject(error);
				} else {
					resolve();
				}
			});
		});
	}

	public selectAll(sql: string, params: SqlParams | null = null) {
		const queryParams = params ?? {};
		return new Promise((resolve, reject) => {
			this.db_.all(sql, queryParams, (error, row) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(row);
			});
		});
	}

	public exec(sql: string, params: SqlParams | null = null) {
		const queryParams = params ?? {};
		return new Promise<void>((resolve, reject) => {
			this.db_.run(sql, queryParams, error => {
				if (error) {
					reject(error);
					return;
				}
				resolve();
			});
		});
	}

	public lastInsertId(): number {
		throw new Error('NOT IMPLEMENTED');
	}
}
