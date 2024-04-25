import JoplinError from './JoplinError';

import { DeltaOptions, GetOptions, ItemStat, PutOptions, basicDelta } from './file-api';
import FsDriverBase, { Stat } from './fs-driver-base';

// NOTE: when synchronising with the file system the time resolution is the second (unlike milliseconds for OneDrive for instance).
// What it means is that if, for example, client 1 changes a note at time t, and client 2 changes the same note within the same second,
// both clients will not know about each others updates during the next sync. They will simply both sync their note and whoever
// comes last will overwrite (on the remote storage) the note of the other client. Both client will then have a different note at
// that point and that will only be resolved if one of them changes the note and sync (if they don't change it, it will never get resolved).
//
// This is compound with the fact that we can't have a reliable delta API on the file system so we need to check all the timestamps
// every time and rely on this exclusively to know about changes.
//
// This explains occasional failures of the fuzzing program (it finds that the clients end up with two different notes after sync). To
// check that it is indeed the problem, check log-database.txt of both clients, search for the note ID, and most likely both notes
// will have been modified at the same exact second at some point. If not, it's another bug that needs to be investigated.

export default class FileApiDriverLocal {
	public static fsDriver_: FsDriverBase;

	private fsErrorToJsError_(error: JoplinError, path: string|null = null) {
		let msg = error.toString();
		if (path !== null) msg += `. Path: ${path}`;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Partial refactor of old coe from before rule was applied
		const output: any = new Error(msg);
		if (error.code) output.code = error.code;
		return output;
	}

	public fsDriver() {
		if (!FileApiDriverLocal.fsDriver_) { throw new Error('FileApiDriverLocal.fsDriver_ not set!'); }
		return FileApiDriverLocal.fsDriver_;
	}

	public async stat(path: string) {
		try {
			const s = await this.fsDriver().stat(path);
			if (!s) return null;
			return this.metadataFromStat_(s);
		} catch (error) {
			throw this.fsErrorToJsError_(error);
		}
	}

	private metadataFromStat_(stat: Stat): ItemStat {
		return {
			path: stat.path,
			// created_time: stat.birthtime.getTime(),
			updated_time: stat.mtime.getTime(),
			isDir: stat.isDirectory(),
		};
	}

	private metadataFromStats_(stats: Stat[]): ItemStat[] {
		const output = [];
		for (let i = 0; i < stats.length; i++) {
			const mdStat = this.metadataFromStat_(stats[i]);
			output.push(mdStat);
		}
		return output;
	}

	public async setTimestamp(path: string, timestampMs: number) {
		try {
			await this.fsDriver().setTimestamp(path, new Date(timestampMs));
		} catch (error) {
			throw this.fsErrorToJsError_(error);
		}
	}

	public async delta(path: string, options: DeltaOptions) {
		const getStatFn = async (path: string) => {
			const stats = await this.fsDriver().readDirStats(path);
			return this.metadataFromStats_(stats);
		};

		try {
			const output = await basicDelta(path, getStatFn, options);
			return output;
		} catch (error) {
			throw this.fsErrorToJsError_(error, path);
		}
	}

	public async list(path: string) {
		try {
			const stats = await this.fsDriver().readDirStats(path);
			const output = this.metadataFromStats_(stats);

			return {
				items: output,
				hasMore: false,
				context: null as unknown,
			};
		} catch (error) {
			throw this.fsErrorToJsError_(error, path);
		}
	}

	public async get(path: string, options: GetOptions) {
		if (!options) options = {};
		let output = null;

		try {
			if (options.target === 'file') {
				// output = await fs.copy(path, options.path, { overwrite: true });
				output = await this.fsDriver().copy(path, options.path);
			} else {
				// output = await fs.readFile(path, options.encoding);
				output = await this.fsDriver().readFile(path, options.encoding);
			}
		} catch (error) {
			if (error.code === 'ENOENT') return null;
			throw this.fsErrorToJsError_(error, path);
		}

		return output;
	}

	public async mkdir(path: string) {
		if (await this.fsDriver().exists(path)) return;

		try {
			await this.fsDriver().mkdir(path);
		} catch (error) {
			throw this.fsErrorToJsError_(error, path);
		}

		// return new Promise((resolve, reject) => {
		// 	fs.exists(path, (exists) => {
		// 		if (exists) {
		// 			resolve();
		// 			return;
		// 		}

		// 		fs.mkdirp(path, (error) => {
		// 			if (error) {
		// 				reject(this.fsErrorToJsError_(error));
		// 			} else {
		// 				resolve();
		// 			}
		// 		});
		// 	});
		// });
	}

	public async put(path: string, content: string, options: PutOptions = null) {
		if (!options) options = {};

		try {
			if (options.source === 'file') {
				await this.fsDriver().copy(options.path, path);
				return;
			}

			await this.fsDriver().writeFile(path, content, 'utf8');
		} catch (error) {
			throw this.fsErrorToJsError_(error, path);
		}
		// if (!options) options = {};

		// if (options.source === 'file') content = await fs.readFile(options.path);

		// return new Promise((resolve, reject) => {
		// 	fs.writeFile(path, content, function(error) {
		// 		if (error) {
		// 			reject(this.fsErrorToJsError_(error));
		// 		} else {
		// 			resolve();
		// 		}
		// 	});
		// });
	}

	public async delete(path: string) {
		try {
			await this.fsDriver().unlink(path);
		} catch (error) {
			throw this.fsErrorToJsError_(error, path);
		}

		// return new Promise((resolve, reject) => {
		// 	fs.unlink(path, function(error) {
		// 		if (error) {
		// 			if (error && error.code == 'ENOENT') {
		// 				// File doesn't exist - it's fine
		// 				resolve();
		// 			} else {
		// 				reject(this.fsErrorToJsError_(error));
		// 			}
		// 		} else {
		// 			resolve();
		// 		}
		// 	});
		// });
	}

	public async move(oldPath: string, newPath: string) {
		try {
			await this.fsDriver().move(oldPath, newPath);
		} catch (error) {
			throw this.fsErrorToJsError_(error, oldPath);
		}

		// let lastError = null;

		// for (let i = 0; i < 5; i++) {
		// 	try {
		// 		let output = await fs.move(oldPath, newPath, { overwrite: true });
		// 		return output;
		// 	} catch (error) {
		// 		lastError = error;
		// 		// Normally cannot happen with the `overwrite` flag but sometime it still does.
		// 		// In this case, retry.
		// 		if (error.code == 'EEXIST') {
		// 			await time.sleep(1);
		// 			continue;
		// 		}
		// 		throw this.fsErrorToJsError_(error);
		// 	}
		// }

		// throw lastError;
	}

	public format() {
		throw new Error('Not supported');
	}

	public async clearRoot(baseDir: string) {
		if (baseDir.startsWith('content://')) {
			const result = await this.list(baseDir);
			for (const item of result.items) {
				await this.fsDriver().remove(item.path);
			}
		} else {
			await this.fsDriver().remove(baseDir);
			await this.fsDriver().mkdir(baseDir);
		}
	}
}
