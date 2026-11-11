// This is a driver for better-sqlite3. It may be interesting to use it instead
// of node-sqlite because it breaks all the time when we try to compile any app.
// The performance improvement probably won't matter.
//
// The issue however is that better-sqlite3 uses the option SQLITE_DQS=0, which
// disallows using double quotes around strings, and that's what we're using
// everywhere. So the only way to make it work would be to do a custom
// compilation, as described there, and set SQLITE_DQS=1:
//
// https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/compilation.md

const Database = require('better-sqlite3');

interface Options {
	name: string;
}

type SqlParams = (string | number | boolean | null)[];

interface PreparedStatement {
	get(params: SqlParams): unknown;
	all(params: SqlParams): unknown[];
	run(params: SqlParams): unknown;
}

interface BetterSqliteDatabase {
	prepare(sql: string): PreparedStatement;
}

interface SqliteError extends Error {
	code?: string;
}

interface WrappedError extends Error {
	code?: string;
}

export default class DatabaseDriverBetterSqlite {

	private db_: BetterSqliteDatabase = null;

	public open(options: Options) {
		this.db_ = new Database(options.name);
	}

	public sqliteErrorToJsError(error: SqliteError, sql: string = null, params: SqlParams = null) {
		console.error(error.toString(), ' ---- ', sql, params);

		const msg = [error.toString()];
		if (sql) msg.push(sql);
		if (params) msg.push(JSON.stringify(params));
		const output: WrappedError = new Error(msg.join(': '));
		if (error.code) output.code = error.code;
		return output;
	}

	public async selectOne(sql: string, params: SqlParams = null) {
		return this.db_.prepare(sql).get(params ? params : []);
	}

	public async selectAll(sql: string, params: SqlParams = null) {
		return this.db_.prepare(sql).all(params ? params : []);
	}

	public async exec(sql: string, params: SqlParams = null) {
		return this.db_.prepare(sql).run(params ? params : []);
	}

	public lastInsertId() {
		throw new Error('NOT IMPLEMENTED');
	}
}
