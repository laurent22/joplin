import FsDriverBase, { ReadDirStatsOptions } from '@joplin/lib/fs-driver-base';
const RNFetchBlob = require('rn-fetch-blob').default;
const RNFS = require('react-native-fs');
const DocumentPicker = require('react-native-document-picker').default;
import { openDocument } from '@joplin/react-native-saf-x';
import RNSAF, { Encoding, DocumentFileDetail, openDocumentTree } from '@joplin/react-native-saf-x';
import { Platform } from 'react-native';
import * as tar from 'tar-stream';
import { resolve } from 'path';
import { Buffer } from 'buffer';
import Logger from '@joplin/lib/Logger';

const logger = Logger.create('fs-driver-rn');

const ANDROID_URI_PREFIX = 'content://';

function isScopedUri(path: string) {
	return path.includes(ANDROID_URI_PREFIX);
}

export default class FsDriverRN extends FsDriverBase {
	public appendFileSync() {
		throw new Error('Not implemented');
	}

	// Encoding can be either "utf8" or "base64"
	public appendFile(path: string, content: any, encoding = 'base64') {
		if (isScopedUri(path)) {
			return RNSAF.writeFile(path, content, { encoding: encoding as Encoding, append: true });
		}
		return RNFS.appendFile(path, content, encoding);
	}

	// Encoding can be either "utf8" or "base64"
	public writeFile(path: string, content: any, encoding = 'base64') {
		if (isScopedUri(path)) {
			return RNSAF.writeFile(path, content, { encoding: encoding as Encoding });
		}
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
		let birthtime;
		const mtime = stat.lastModified ? new Date(stat.lastModified) : stat.mtime;
		if (stat.lastModified) {
			birthtime = new Date(stat.lastModified);
		} else if (stat.ctime) {
			// Confusingly, "ctime" normally means "change time" but here it's used as "creation time". Also sometimes it is null
			birthtime = stat.ctime;
		} else {
			birthtime = stat.mtime;
		}
		return {
			birthtime,
			mtime,
			isDirectory: () => stat.type ? stat.type === 'directory' : stat.isDirectory(),
			path: path,
			size: stat.size,
		};
	}

	public async readDirStats(path: string, options: any = null) {
		if (!options) options = {};
		if (!('recursive' in options)) options.recursive = false;

		const isScoped = isScopedUri(path);

		let stats = [];
		try {
			if (isScoped) {
				stats = await RNSAF.listFiles(path);
			} else {
				stats = await RNFS.readDir(path);
			}
		} catch (error) {
			throw new Error(`Could not read directory: ${path}: ${error.message}`);
		}

		let output: any[] = [];
		for (let i = 0; i < stats.length; i++) {
			const stat = stats[i];
			const relativePath = (isScoped ? stat.uri : stat.path).substr(path.length + 1);
			const standardStat = this.rnfsStatToStd_(stat, relativePath);
			output.push(standardStat);

			if (isScoped) {
				// readUriDirStatsHandleRecursion_ expects stat to have a URI property.
				// Use the original stat.
				output = await this.readUriDirStatsHandleRecursion_(stat, output, options);
			} else {
				output = await this.readDirStatsHandleRecursion_(path, standardStat, output, options);
			}
		}
		return output;
	}


	protected async readUriDirStatsHandleRecursion_(stat: DocumentFileDetail, output: DocumentFileDetail[], options: ReadDirStatsOptions) {
		if (options.recursive && stat.type === 'directory') {
			const subStats = await this.readDirStats(stat.uri, options);
			for (let j = 0; j < subStats.length; j++) {
				const subStat = subStats[j];
				output.push(subStat);
			}
		}
		return output;
	}

	public async move(source: string, dest: string) {
		if (isScopedUri(source) || isScopedUri(dest)) {
			await RNSAF.moveFile(source, dest, { replaceIfDestinationExists: true });
		}
		return RNFS.moveFile(source, dest);
	}

	public async rename(source: string, dest: string) {
		if (isScopedUri(source) || isScopedUri(dest)) {
			await RNSAF.rename(source, dest);
		}
		return RNFS.moveFile(source, dest);
	}

	public async exists(path: string) {
		if (isScopedUri(path)) {
			return RNSAF.exists(path);
		}
		return RNFS.exists(path);
	}

	public async mkdir(path: string) {
		if (isScopedUri(path)) {
			await RNSAF.mkdir(path);
			return;
		}

		// Also creates parent directories: Works like mkdir -p
		return RNFS.mkdir(path);
	}

	public async stat(path: string) {
		try {
			let r;
			if (isScopedUri(path)) {
				r = await RNSAF.stat(path);
			} else {
				r = await RNFS.stat(path);
			}
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
		if (isScopedUri(path)) {
			throw new Error('open() not implemented in FsDriverAndroid');
		}
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

	public close(): Promise<void> {
		// Nothing
		return null;
	}

	public readFile(path: string, encoding = 'utf8') {
		if (encoding === 'Buffer') throw new Error('Raw buffer output not supported for FsDriverRN.readFile');
		if (isScopedUri(path)) {
			return RNSAF.readFile(path, { encoding: encoding as Encoding });
		}
		return RNFS.readFile(path, encoding);
	}

	// Always overwrite destination
	public async copy(source: string, dest: string) {
		let retry = false;
		try {
			if (isScopedUri(source) || isScopedUri(dest)) {
				await RNSAF.copyFile(source, dest, { replaceIfDestinationExists: true });
				return;
			}
			await RNFS.copyFile(source, dest);
		} catch (error) {
			// On iOS it will throw an error if the file already exist
			retry = true;
			await this.unlink(dest);
		}

		if (retry) {
			if (isScopedUri(source) || isScopedUri(dest)) {
				await RNSAF.copyFile(source, dest, { replaceIfDestinationExists: true });
			} else {
				await RNFS.copyFile(source, dest);
			}
		}
	}

	public async unlink(path: string) {
		try {
			if (isScopedUri(path)) {
				await RNSAF.unlink(path);
				return;
			}
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

	public async tarExtract(_options: any) {
		throw new Error('Not implemented: tarExtract');
	}

	public async tarCreate(options: any, filePaths: string[]) {
		const cwd = options.cwd; // TODO: What if this is undefined?
		const file = resolve(cwd, options.file);

		if (await this.exists(file)) {
			throw new Error('Error! Destination already exists');
		}

		const pack = tar.pack();

		for (const path of filePaths) {
			const absPath = resolve(cwd, path);
			const stat = await this.stat(absPath);
			const sizeBytes: number = stat.size;

			const entry = pack.entry({ name: path, size: sizeBytes }, (error) => {
				if (error) {
					logger.error(`Tar error: ${error}`);
				}
			});

			const chunkSize = 1024 * 10; // 10 KiB
			for (let offset = 0; offset < sizeBytes; offset += chunkSize) {
				// The RNFS documentation suggests using base64 for binary files.
				const part = await RNFS.read(absPath, chunkSize, offset, 'base64');
				entry.write(Buffer.from(part, 'base64'));
			}
			entry.end();
		}

		pack.finalize();

		// The streams used by tar-stream seem not to support a chunk size
		// (it seems despite the typings provided).
		let data: number[]|null = null;
		while ((data = pack.read()) !== null) {
			const buff = Buffer.from(data);
			const base64Data = buff.toString('base64');
			await this.appendFile(file, base64Data, 'base64');
		}
	}

	public async getExternalDirectoryPath(): Promise<string | undefined> {
		let directory;
		if (this.isUsingAndroidSAF()) {
			const doc = await openDocumentTree(true);
			if (doc?.uri) {
				directory = doc?.uri;
			}
		} else {
			directory = RNFS.ExternalDirectoryPath;
		}
		return directory;
	}

	public isUsingAndroidSAF() {
		return Platform.OS === 'android' && Platform.Version > 28;
	}

	/** always returns an array */
	public async pickDocument(options: { multiple: false }) {
		const { multiple = false } = options || {};
		let result;
		try {
			if (this.isUsingAndroidSAF()) {
				result = await openDocument({ multiple });
				if (!result) {
					// to catch the error down below using the 'cancel' keyword
					throw new Error('User canceled document picker');
				}
				result = result.map(r => {
					(r.type as string) = r.mime;
					((r as any).fileCopyUri as string) = r.uri;
					return r;
				});
			} else {
				// the result is an array
				if (multiple) {
					result = await DocumentPicker.pickMultiple();
				} else {
					result = [await DocumentPicker.pick()];
				}
			}
		} catch (error) {
			if (DocumentPicker.isCancel(error) || error?.message?.includes('cancel')) {
				// eslint-disable-next-line no-console
				console.info('pickDocuments: user has cancelled');
				return null;
			} else {
				throw error;
			}
		}

		return result;
	}
}
