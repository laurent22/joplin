/* eslint-disable @typescript-eslint/no-explicit-any */
import shim from './shim';

export default class DatabaseDriverNode {
	private db_: any;

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

	public sqliteErrorToJsError(error: any, sql: string | null = null, params: any = null) {
		const msg = [error.toString()];
		if (sql) msg.push(sql);
		if (params) msg.push(params);
		const output: any = new Error(msg.join(': '));
		if (error.code) output.code = error.code;
		return output;
	}

	public selectOne(sql: string, params: any = null) {
		if (!params) params = {};
		return new Promise((resolve, reject) => {
			this.db_.get(sql, params, (error: Error | null, row: any) => {
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
			this.db_.loadExtension(path, (error: Error | null) => {
				if (error) {
					reject(error);
				} else {
					resolve();
				}
			});
		});
	}

	public selectAll(sql: string, params: any = null) {
		if (!params) params = {};
		return new Promise<any[]>((resolve, reject) => {
			this.db_.all(sql, params, (error: Error | null, rows: any[]) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(rows);
			});
		});
	}

	public exec(sql: string, params: any = null) {
		if (!params) params = {};
		return new Promise<void>((resolve, reject) => {
			this.db_.run(sql, params, (error: Error | null) => {
				if (error) {
					reject(error);
					return;
				}
				resolve();
			});
		});
	}

	public lastInsertId() {
		throw new Error('NOT IMPLEMENTED');
	}
}
