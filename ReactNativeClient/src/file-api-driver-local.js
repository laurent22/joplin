import fs from 'fs';
import fse from 'fs-extra';
import { promiseChain } from 'src/promise-utils.js';
import moment from 'moment';

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

	statTimeToUnixTimestamp_(time) {
		let m = moment(time, 'YYYY-MM-DDTHH:mm:ss.SSSZ');
		if (!m.isValid()) {
			throw new Error('Invalid date: ' + time);
		}
		return Math.round(m.toDate().getTime() / 1000);
	}

	metadataFromStats_(path, stats) {
		return {
			path: path,
			createdTime: this.statTimeToUnixTimestamp_(stats.birthtime),
			updatedTime: this.statTimeToUnixTimestamp_(stats.mtime),
			createdTimeOrig: stats.birthtime,
			updatedTimeOrig: stats.mtime,
			isDir: stats.isDirectory(),
		};
	}

	setTimestamp(path, timestamp) {
		return new Promise((resolve, reject) => {
			fs.utimes(path, timestamp, timestamp, (error) => {
				if (error) {
					reject(error);
					return;
				}
				resolve();
			});
		});
	}

	list(path) {
		return new Promise((resolve, reject) => {
			fs.readdir(path, (error, items) => {
				if (error) {
					reject(error);
					return;
				}

				let chain = [];
				for (let i = 0; i < items.length; i++) {
					chain.push((output) => {
						if (!output) output = [];
						return this.stat(path + '/' + items[i]).then((stat) => {
							output.push(stat);
							return output;							
						});
					});
				}

				return promiseChain(chain).then((results) => {
					if (!results) results = [];
					resolve(results);
				}).catch((error) => {
					reject(error);
				});
			});
		});
	}

	get(path) {
		return new Promise((resolve, reject) => {
			fs.readFile(path, 'utf8', (error, content) => {
				if (error) {
					if (error.code == 'ENOENT') {
						// Return null in this case so that it's possible to get a file
						// without checking if it exists first.
						resolve(null);
					} else {
						reject(error);
					}
					return;
				}
				return resolve(content);
			});
		});
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

	move(oldPath, newPath) {
		return new Promise((resolve, reject) => {
			fse.move(oldPath, newPath, function(error) {
				if (error) {
					reject(error);
				} else {
					resolve();
				}
			});
		});
	}

	format() {
		throw new Error('Not supported');
	}

}

export { FileApiDriverLocal };