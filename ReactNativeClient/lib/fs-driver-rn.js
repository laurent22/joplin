const RNFS = require('react-native-fs');
const FsDriverBase = require('lib/fs-driver-base');

class FsDriverRN extends FsDriverBase {

	appendFileSync(path, string) {
		throw new Error('Not implemented');
	}

	appendFile(path, string, encoding = 'base64') {
		return RNFS.appendFile(path, string, encoding);
	}

	writeFile(path, string, encoding = 'base64') {
		return RNFS.writeFile(path, string, encoding);
	}

	// same as rm -rf
	async remove(path) {
		throw new Error('Not implemented');
	}

	writeBinaryFile(path, content) {
		throw new Error('Not implemented');
	}

	// Returns a format compatible with Node.js format
	rnfsStatToStd_(stat, path) {
		return {
			birthtime: stat.ctime ? stat.ctime : stat.mtime, // Confusingly, "ctime" normally means "change time" but here it's used as "creation time". Also sometimes it is null
			mtime: stat.mtime,
			isDirectory: () => stat.isDirectory(),
			path: path,
			size: stat.size,
		};  
	}

	async readDirStats(path, options = null) {
		if (!options) options = {};
		if (!('recursive' in options)) options.recursive = false;
		
		let items = await RNFS.readDir(path);
		let output = [];
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			const relativePath = item.path.substr(path.length + 1);
			output.push(this.rnfsStatToStd_(item, relativePath));

			output = await this.readDirStatsHandleRecursion_(path, item, output, options);
		}
		return output;
	}

	async move(source, dest) {
		return RNFS.moveFile(source, dest);
	}

	async exists(path) {
		return RNFS.exists(path);
	}

	async mkdir(path) {
		return RNFS.mkdir(path);
	}

	async stat(path) {
		try {
			const r = await RNFS.stat(path);
			return this.rnfsStatToStd_(r, path);
		} catch (error) {
			if (error && ((error.message && error.message.indexOf('exist') >= 0) || error.code === 'ENOENT')) {
				// Probably { [Error: File does not exist] framesToPop: 1, code: 'EUNSPECIFIED' }
				// which unfortunately does not have a proper error code. Can be ignored.
				return null;
			} else {
				throw error;
			}
		}
	}

	// NOTE: DOES NOT WORK - no error is thrown and the function is called with the right
	// arguments but the function returns `false` and the timestamp is not set.
	// Current setTimestamp is not really used so keep it that way, but careful if it
	// becomes needed.
	async setTimestamp(path, timestampDate) {
		// return RNFS.touch(path, timestampDate, timestampDate);
	}

	async open(path, mode) {
		// Note: RNFS.read() doesn't provide any way to know if the end of file has been reached.
		// So instead we stat the file here and use stat.size to manually check for end of file.
		// Bug: https://github.com/itinance/react-native-fs/issues/342
		const stat = await this.stat(path);
		return {
			path: path,
			offset: 0,
			mode: mode,
			stat: stat,
		}
	}

	close(handle) {
		return null;
	}

	readFile(path, encoding = 'utf8') {
		if (encoding === 'Buffer') throw new Error('Raw buffer output not supported for FsDriverRN.readFile');
		return RNFS.readFile(path, encoding);
	}

	// Always overwrite destination
	async copy(source, dest) {
		let retry = false;
		try {
			await RNFS.copyFile(source, dest);
		} catch (error) {
			// On iOS it will throw an error if the file already exist
			retry = true;
			await this.unlink(dest);
		}

		if (retry) await RNFS.copyFile(source, dest);
	}

	async unlink(path) {
		try {
			await RNFS.unlink(path);
		} catch (error) {
			if (error && ((error.message && error.message.indexOf('exist') >= 0) || error.code === 'ENOENT')) {
				// Probably { [Error: File does not exist] framesToPop: 1, code: 'EUNSPECIFIED' }
				// which unfortunately does not have a proper error code. Can be ignored.
			} else {
				throw error;
			}
		}
	}

	async readFileChunk(handle, length, encoding = 'base64') {
		if (handle.offset + length > handle.stat.size) {
			length = handle.stat.size - handle.offset;
		}

		if (!length) return null;
		let output = await RNFS.read(handle.path, length, handle.offset, encoding);
		handle.offset += length;
		return output ? output : null;
	}

}

module.exports.FsDriverRN = FsDriverRN;