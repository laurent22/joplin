import fs from 'fs-extra';
import { promiseChain } from 'lib/promise-utils.js';
import moment from 'moment';
import { time } from 'lib/time-utils.js';

class FileApiDriverLocal {

	stat(path) {
		return new Promise((resolve, reject) => {
			fs.stat(path, (error, s) => {
				if (error) {
					if (error.code == 'ENOENT') {
						resolve(null);
					} else {
						reject(error);
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
					reject(error);
					return;
				}
				resolve();
			});
		});
	}

	async list(path, options) {
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
	}

	async get(path, options) {
		let output = null;

		try {
			if (options.encoding == 'binary') {
				output = fs.readFile(path);
			} else {
				output = fs.readFile(path, options.encoding);
			}
		} catch (error) {
			if (error.code == 'ENOENT') return null;
			throw error;
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

				const mkdirp = require('mkdirp');
			
				mkdirp(path, (error) => {
					if (error) {
						reject(error);
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
					reject(error);
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
						reject(error);
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
				throw error;
			}
		}

		throw lastError;
	}

	format() {
		throw new Error('Not supported');
	}

}

export { FileApiDriverLocal };