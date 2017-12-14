const fs = require('fs-extra');
const { promiseChain } = require('lib/promise-utils.js');
const moment = require('moment');
const BaseItem = require('lib/models/BaseItem.js');
const { time } = require('lib/time-utils.js');

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

class FileApiDriverLocal {

	fsErrorToJsError_(error) {
		let msg = error.toString();
		let output = new Error(msg);
		if (error.code) output.code = error.code;
		return output;
	}

	stat(path) {
		return new Promise((resolve, reject) => {
			fs.stat(path, (error, s) => {
				if (error) {
					if (error.code == 'ENOENT') {
						resolve(null);
					} else {
						reject(this.fsErrorToJsError_(error));
					}
					return;
				}
				resolve(this.metadataFromStats_(path, s));
			});			
		});
	}

	statTimeToTimestampMs_(time) {
		let m = moment(time, 'YYYY-MM-DDTHH:mm:ss.SSSZ');
		if (!m.isValid()) {
			throw new Error('Invalid date: ' + time);
		}
		return m.toDate().getTime();
	}

	metadataFromStats_(path, stats) {
		return {
			path: path,
			created_time: this.statTimeToTimestampMs_(stats.birthtime),
			updated_time: this.statTimeToTimestampMs_(stats.mtime),
			created_time_orig: stats.birthtime,
			updated_time_orig: stats.mtime,
			isDir: stats.isDirectory(),
		};
	}

	setTimestamp(path, timestampMs) {
		return new Promise((resolve, reject) => {
			let t = Math.floor(timestampMs / 1000);
			fs.utimes(path, t, t, (error) => {
				if (error) {
					reject(this.fsErrorToJsError_(error));
					return;
				}
				resolve();
			});
		});
	}

	async delta(path, options) {
		const itemIds = await options.allItemIdsHandler();

		try {
			let items = await fs.readdir(path);
			let output = [];
			for (let i = 0; i < items.length; i++) {
				let stat = await this.stat(path + '/' + items[i]);
				if (!stat) continue; // Has been deleted between the readdir() call and now
				stat.path = items[i];
				output.push(stat);
			}

			if (!Array.isArray(itemIds)) throw new Error('Delta API not supported - local IDs must be provided');

			let deletedItems = [];
			for (let i = 0; i < itemIds.length; i++) {
				const itemId = itemIds[i];
				let found = false;
				for (let j = 0; j < output.length; j++) {
					const item = output[j];
					if (BaseItem.pathToId(item.path) == itemId) {
						found = true;
						break;
					}
				}

				if (!found) {
					deletedItems.push({
						path: BaseItem.systemPath(itemId),
						isDeleted: true,
					});
				}
			}

			output = output.concat(deletedItems);

			return {
				hasMore: false,
				context: null,
				items: output,
			};
		} catch(error) {
			throw this.fsErrorToJsError_(error);
		}
	}

	async list(path, options) {
		try {
			let items = await fs.readdir(path);
			let output = [];
			for (let i = 0; i < items.length; i++) {
				let stat = await this.stat(path + '/' + items[i]);
				if (!stat) continue; // Has been deleted between the readdir() call and now
				stat.path = items[i];
				output.push(stat);
			}

			return {
				items: output,
				hasMore: false,
				context: null,
			};
		} catch(error) {
			throw this.fsErrorToJsError_(error);
		}
	}

	async get(path, options) {
		let output = null;

		try {
			if (options.target === 'file') {
				output = await fs.copy(path, options.path, { overwrite: true });
			} else {
				output = await fs.readFile(path, options.encoding);
			}

			// if (options.encoding == 'binary') {
			// 	output = await fs.readFile(path);
			// } else {
			// 	output = await fs.readFile(path, options.encoding);
			// }
		} catch (error) {
			if (error.code == 'ENOENT') return null;
			throw this.fsErrorToJsError_(error);
		}

		return output;
	}

	mkdir(path) {
		return new Promise((resolve, reject) => {
			fs.exists(path, (exists) => {
				if (exists) {
					resolve();
					return;
				}
			
				fs.mkdirp(path, (error) => {
					if (error) {
						reject(this.fsErrorToJsError_(error));
					} else {
						resolve();
					}
				});
			});
		});
	}

	put(path, content) {
		return new Promise((resolve, reject) => {
			fs.writeFile(path, content, function(error) {
				if (error) {
					reject(this.fsErrorToJsError_(error));
				} else {
					resolve();
				}
			});
		});
	}

	delete(path) {
		return new Promise((resolve, reject) => {
			fs.unlink(path, function(error) {
				if (error) {
					if (error && error.code == 'ENOENT') {
						// File doesn't exist - it's fine
						resolve();
					} else {
						reject(this.fsErrorToJsError_(error));
					}
				} else {
					resolve();
				}
			});
		});
	}

	async move(oldPath, newPath) {
		let lastError = null;
		
		for (let i = 0; i < 5; i++) {
			try {
				let output = await fs.move(oldPath, newPath, { overwrite: true });
				return output;
			} catch (error) {
				lastError = error;
				// Normally cannot happen with the `overwrite` flag but sometime it still does.
				// In this case, retry.
				if (error.code == 'EEXIST') {
					await time.sleep(1);
					continue;
				}
				throw this.fsErrorToJsError_(error);
			}
		}

		throw lastError;
	}

	format() {
		throw new Error('Not supported');
	}

}

module.exports = { FileApiDriverLocal };