const { sqlite3Worker1Promiser } = require('@sqlite.org/sqlite-wasm');
import DatabaseDriver, { DatabaseCloseOptions, DatabaseOpenOptions } from '@joplin/lib/database-driver';
import { safeFilename } from '@joplin/utils/path';

type DbPromiser = (command: string, options: Record<string, unknown>)=> Promise<unknown>;
type DbId = unknown;
type RowResult = { rowNumber: number|null; row: unknown };

const getDatabaseFilename = (name: string) => `${safeFilename(name)}.sqlite3`;

export default class DatabaseDriverReactNative implements DatabaseDriver {
	private lastInsertId_: string;
	private db_: DbPromiser;
	private dbId_: DbId;
	public constructor() {
		this.lastInsertId_ = null;
	}

	public async open(options: DatabaseOpenOptions) {
		const db = await new Promise<DbPromiser>((resolve) => {
			const db = sqlite3Worker1Promiser({
				onready: () => resolve(db),
			});
		});

		type OpenResult = { dbId: number };
		const { dbId } = await db('open', {
			filename: `file:${getDatabaseFilename(options.name)}?vfs=opfs`,
		}) as OpenResult;
		this.dbId_ = dbId;
		this.db_ = db;
	}

	public async deleteDatabase(options: DatabaseCloseOptions) {
		const databaseContainerDirectory = await navigator.storage.getDirectory();
		const databaseFilename = getDatabaseFilename(options.name);
		// Note: Assumes there is only one file associated with the database (i.e. WAL mode
		// is not enabled).
		await databaseContainerDirectory.removeEntry(databaseFilename);
	}

	public sqliteErrorToJsError(error: Error) {
		return error;
	}

	public selectOne(sql: string, params: string[] = []) {
		// eslint-disable-next-line no-async-promise-executor -- Wraps an API that mixes callbacks and promises.
		return new Promise<unknown>(async (resolve, reject) => {
			let resolved = false;

			await this.db_('exec', {
				dbId: this.dbId_,
				sql,
				bind: params,
				rowMode: 'object',
				callback: ((result: RowResult) => {
					if (result.rowNumber !== 1) return;
					resolved = true;
					resolve(result.row);
				}),
			}).catch(reject);

			if (!resolved) {
				resolve(null);
			}
		});
	}

	public async selectAll(sql: string, params: string[] = null) {
		const results: unknown[] = [];
		await this.db_('exec', {
			dbId: this.dbId_,
			sql,
			bind: params,
			rowMode: 'object',
			callback: ((rowResult: RowResult) => {
				if (rowResult.rowNumber) {
					while (results.length < rowResult.rowNumber) {
						results.push(null);
					}
					results[rowResult.rowNumber - 1] = rowResult.row;
				}
			}),
		});

		return results;
	}

	public loadExtension(path: string) {
		throw new Error(`No extension support for ${path} in sqlite wasm`);
	}

	public async exec(sql: string, params: string[]|null = null) {
		const result = await this.db_('exec', {
			dbId: this.dbId_,
			sql,
			bind: params,
		});
		return result;
	}

	public lastInsertId() {
		return this.lastInsertId_;
	}
}
