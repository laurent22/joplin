const SQLite = require('react-native-sqlite-storage');


export default class DatabaseDriverReactNative {
	private lastInsertId_: string;
	private db_: any;
	public constructor() {
		this.lastInsertId_ = null;
	}

	public open(options: { name: string }) {
		// SQLite.DEBUG(true);
		return new Promise<void>((resolve, reject) => {
			SQLite.openDatabase(
				{ name: options.name },
				(db: any) => {
					this.db_ = db;
					resolve();
				},
				(error: Error) => {
					reject(error);
				},
			);
		});
	}

	public sqliteErrorToJsError(error: Error) {
		return error;
	}

	public selectOne(sql: string, params: any = null) {
		return new Promise<unknown>((resolve, reject) => {
			this.db_.executeSql(
				sql,
				params,
				(r: any) => {
					resolve(r.rows.length ? r.rows.item(0) : null);
				},
				(error: Error) => {
					reject(error);
				},
			);
		});
	}

	public selectAll(sql: string, params: any = null) {
		// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
		return this.exec(sql, params).then(r => {
			const output = [];
			for (let i = 0; i < r.rows.length; i++) {
				output.push(r.rows.item(i));
			}
			return output;
		});
	}

	public loadExtension(path: string) {
		throw new Error(`No extension support for ${path} in react-native-sqlite-storage`);
	}

	public exec(sql: string, params: any = null) {
		return new Promise<any>((resolve, reject) => {
			this.db_.executeSql(
				sql,
				params,
				(r: { insertId: string }) => {
					if ('insertId' in r) this.lastInsertId_ = r.insertId;
					resolve(r);
				},
				(error: Error) => {
					reject(error);
				},
			);
		});
	}

	public lastInsertId() {
		return this.lastInsertId_;
	}
}