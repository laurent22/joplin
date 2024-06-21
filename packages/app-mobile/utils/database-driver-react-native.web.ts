const { sqlite3Worker1Promiser } = require('@sqlite.org/sqlite-wasm');
import { safeFilename } from "@joplin/utils/path";

type DbPromiser = (command: string, options: Record<string, unknown>)=>Promise<any>;
type DbId = unknown;
type RowResult = { rowNumber: number|null; row: unknown; };

export default class DatabaseDriverReactNative {
	private lastInsertId_: string;
	private db_: DbPromiser;
	private dbId_: DbId;
	public constructor() {
		this.lastInsertId_ = null;
	}

	public async open(options: { name: string }) {
		// SQLite.DEBUG(true);
		const db = await new Promise<DbPromiser>((resolve) => {
			const db = sqlite3Worker1Promiser({
				onready: () => resolve(db),
			});
		});
		const filename = `file:${safeFilename(options.name)}.sqlite3?vfs=opfs`;
		const { dbId } = await db('open', { filename });
		console.log('initialized db with ID ', dbId, 'at', filename);
		this.dbId_ = dbId;
		this.db_ = db;
	}

	public sqliteErrorToJsError(error: Error) {
		return error;
	}

	public selectOne(sql: string, params: string[] = []) {
		console.log('selectOne', sql);
		return new Promise<unknown>(async (resolve, reject) => {
			let resolved = false;
			await this.db_('exec', {
				dbId: this.dbId_,
				sql,
				bind: params,
				rowMode: 'object',
				callback: ((result: RowResult) => {
					console.log('got', result)
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

	public async selectAll(sql: string, params: any = null) {
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
		console.log('preExec', sql);

		const result = await this.db_('exec', {
			dbId: this.dbId_,
			sql,
			bind: params,
		});
		console.log('exec', sql, result);
		return result;
	}

	public lastInsertId() {
		return this.lastInsertId_;
	}
}