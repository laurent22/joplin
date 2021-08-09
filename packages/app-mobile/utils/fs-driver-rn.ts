import FsDriverBase from '@joplin/lib/fs-driver-base';
const RNFetchBlob = require('rn-fetch-blob').default;
const RNFS = require('react-native-fs');

export default class FsDriverRN extends FsDriverBase {
	public appendFileSync() {
		throw new Error('Not implemented');
	}

	// Encoding can be either "utf8" or "base64"
	public appendFile(path: string, content: any, encoding = 'base64') {
		return RNFS.appendFile(path, content, encoding);
	}

	// Encoding can be either "utf8" or "base64"
	public writeFile(path: string, content: any, encoding = 'base64') {
		// We need to use rn-fetch-blob here due to this bug:
		// https://github.com/itinance/react-native-fs/issues/700
		return RNFetchBlob.fs.writeFile(path, content, encoding);
	}

	// same as rm -rf
	public async remove(path: string) {
		return await this.unlink(path);
	}

	// Returns a format compatible with Node.js format
	private rnfsStatToStd_(stat: any, path: string) {
		return {
			birthtime: stat.ctime ? stat.ctime : stat.mtime, // Confusingly, "ctime" normally means "change time" but here it's used as "creation time". Also sometimes it is null
			mtime: stat.mtime,
			isDirectory: () => stat.isDirectory(),
			path: path,
			size: stat.size,
		};
	}

	public async readDirStats(path: string, options: any = null) {
		if (!options) options = {};
		if (!('recursive' in options)) options.recursive = false;

		let items = [];
		try {
			items = await RNFS.readDir(path);
		} catch (error) {
			throw new Error(`Could not read directory: ${path}: ${error.message}`);
		}

		let output: any[] = [];
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			const relativePath = item.path.substr(path.length + 1);
			output.push(this.rnfsStatToStd_(item, relativePath));

			output = await this.readDirStatsHandleRecursion_(path, item, output, options);
		}
		return output;
	}

	public async move(source: string, dest: string) {
		return RNFS.moveFile(source, dest);
	}

	public async exists(path: string) {
		return RNFS.exists(path);
	}

	public async mkdir(path: string) {
		return RNFS.mkdir(path);
	}

	public async stat(path: string) {
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
	public async setTimestamp() {
		// return RNFS.touch(path, timestampDate, timestampDate);
	}

	public async open(path: string, mode: number) {
		// Note: RNFS.read() doesn't provide any way to know if the end of file has been reached.
		// So instead we stat the file here and use stat.size to manually check for end of file.
		// Bug: https://github.com/itinance/react-native-fs/issues/342
		const stat = await this.stat(path);
		return {
			path: path,
			offset: 0,
			mode: mode,
			stat: stat,
		};
	}

	public close(): void {
		// Nothing
	}

	public readFile(path: string, encoding = 'utf8') {
		if (encoding === 'Buffer') throw new Error('Raw buffer output not supported for FsDriverRN.readFile');
		return RNFS.readFile(path, encoding);
	}

	// Always overwrite destination
	public async copy(source: string, dest: string) {
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

	public async unlink(path: string) {
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

	public async readFileChunk(handle: any, length: number, encoding = 'base64') {
		if (handle.offset + length > handle.stat.size) {
			length = handle.stat.size - handle.offset;
		}

		if (!length) return null;
		const output = await RNFS.read(handle.path, length, handle.offset, encoding);
		// eslint-disable-next-line require-atomic-updates
		handle.offset += length;
		return output ? output : null;
	}

	public resolve(path: string) {
		throw new Error(`Not implemented: resolve(): ${path}`);
	}

	public resolveRelativePathWithinDir(_baseDir: string, relativePath: string) {
		throw new Error(`Not implemented: resolveRelativePathWithinDir(): ${relativePath}`);
	}

	public async md5File(path: string): Promise<string> {
		throw new Error(`Not implemented: md5File(): ${path}`);
	}
}
