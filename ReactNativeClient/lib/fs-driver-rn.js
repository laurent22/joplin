const RNFS = require('react-native-fs');

class FsDriverRN {

	appendFileSync(path, string) {
		throw new Error('Not implemented');
	}

	appendFile(path, string, encoding = 'base64') {
		return RNFS.appendFile(path, string, encoding);
	}

	writeBinaryFile(path, content) {
		throw new Error('Not implemented');
	}

	move(source, dest) {
		throw new Error('Not implemented');
	}

	async open(path, mode) {
		// Note: RNFS.read() doesn't provide any way to know if the end of file has been reached.
		// So instead we stat the file here and use stat.size to manually check for end of file.
		// Bug: https://github.com/itinance/react-native-fs/issues/342
		const stat = await RNFS.stat(path);
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

	readFile(path) {
		throw new Error('Not implemented');
	}

	async unlink(path) {
		try {
			await RNFS.unlink(path);
		} catch (error) {
			if (error && error.message && error.message.indexOf('exist') >= 0) {
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