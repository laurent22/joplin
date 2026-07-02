import FsDriverBase, { ReadDirStatsOptions } from '@joplin/lib/fs-driver-base';
import RNFetchBlob from 'rn-fetch-blob';
import * as RNFS from '@dr.pogodin/react-native-fs';
import RNSAF, { DocumentFileDetail, openDocumentTree } from '@joplin/react-native-saf-x';
import type { StatResultT, ReadDirResItemT } from '@dr.pogodin/react-native-fs';

type RnfsStatLike = StatResultT | ReadDirResItemT | DocumentFileDetail;
import { Platform } from 'react-native';
import tarCreate from './tarCreate';
import tarExtract from './tarExtract';
import JoplinError from '@joplin/lib/JoplinError';
const md5 = require('md5');
import { resolve } from 'path';
import Logger from '@joplin/utils/Logger';
const logger = Logger.create('fs-driver-rn');

const ANDROID_URI_PREFIX = 'content://';

function isScopedUri(path: string) {
	return path.includes(ANDROID_URI_PREFIX);
}

// Encodings supported by rn-fetch-blob, RNSAF, and
// RNFS.
// See also
// - https://github.com/itinance/react-native-fs#readfilefilepath-string-encoding-string-promisestring
// - https://github.com/joltup/rn-fetch-blob/blob/cf9e8843599de92031df2660d5a1da18491fa3c0/android/src/main/java/com/RNFetchBlob/RNFetchBlobFS.java#L1049
export enum SupportedEncoding {
	Utf8 = 'utf8',
	Ascii = 'ascii',
	Base64 = 'base64',
}
const supportedEncodings = Object.values<string>(SupportedEncoding);

// Converts some encodings specifiers that work with NodeJS into encodings
// that work with RNSAF, RNFetchBlob.fs, and RNFS.
//
// Throws if an encoding can't be normalized.
const normalizeEncoding = (encoding: string): SupportedEncoding => {
	encoding = encoding.toLowerCase();

	// rn-fetch-blob and RNSAF require the exact string "utf8", but NodeJS (and thus
	// fs-driver-node) support variants on this like "UtF-8" and "utf-8". Convert them:
	if (encoding === 'utf-8') {
		encoding = 'utf8';
	}

	if (!supportedEncodings.includes(encoding)) {
		throw new Error(`Unsupported encoding: ${encoding}.`);
	}

	return encoding as SupportedEncoding;
};

export default class FsDriverRN extends FsDriverBase {
	public appendFileSync() {
		throw new Error('Not implemented: appendFileSync');
	}

	// Requires that the file already exists.
	// TODO: Update for compatibility with fs-driver-node's appendFile (which does not
	//       require that the file exists).
	public appendFile(path: string, content: string, rawEncoding = 'base64') {
		const encoding = normalizeEncoding(rawEncoding);

		if (isScopedUri(path)) {
			return RNSAF.writeFile(path, content, { encoding, append: true });
		}
		return RNFS.appendFile(path, content, encoding);
	}

	// Encoding can be either "utf8", "utf-8", or "base64"
	public writeFile(path: string, content: string, rawEncoding = 'base64') {
		const encoding = normalizeEncoding(rawEncoding);

		if (isScopedUri(path)) {
			return RNSAF.writeFile(path, content, { encoding: encoding });
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
	private rnfsStatToStd_(stat: RnfsStatLike, path: string) {
		let birthtime;
		const lastModified = 'lastModified' in stat ? stat.lastModified : undefined;
		const ctime = 'ctime' in stat ? stat.ctime : undefined;
		const mtime = lastModified ? new Date(lastModified) : ('mtime' in stat ? stat.mtime : undefined);
		if (lastModified) {
			birthtime = new Date(lastModified);
		} else if (ctime) {
			// Confusingly, "ctime" normally means "change time" but here it's used as "creation time". Also sometimes it is null
			birthtime = ctime;
		} else {
			birthtime = 'mtime' in stat ? stat.mtime : undefined;
		}
		return {
			birthtime,
			mtime,
			isDirectory: () => 'type' in stat && stat.type ? stat.type === 'directory' : ('isDirectory' in stat ? stat.isDirectory() : false),
			path: path,
			size: stat.size,
		};
	}

	public async readDirStats(path: string, options: ReadDirStatsOptions = null) {
		if (!options) options = { recursive: false };

		const isScoped = isScopedUri(path);

		let stats: RnfsStatLike[] = [];
		try {
			if (isScoped) {
				stats = await RNSAF.listFiles(path);
			} else {
				stats = await RNFS.readDir(path);
			}
		} catch (error) {
			throw new Error(`Could not read directory: ${path}: ${error.message}`);
		}

		const toRelativePath = (stat: RnfsStatLike) => {
			let relativePath = isScoped ? (stat as DocumentFileDetail).uri : (stat as StatResultT | ReadDirResItemT).path;

			// Workaround: Paths returned by RNFS.readDir can include a leading /private/, when this isn't included
			// in the original path variable:
			if (relativePath.startsWith('/private/') && !path.startsWith('/private/')) {
				relativePath = relativePath.replace(/^\/private/, '');
			}

			if (!relativePath.startsWith(path)) {
				logger.warn('readDirStats: Relative path does not start with original:', { relativePath, path });
			}

			relativePath = relativePath.substring(path.length + 1);
			return relativePath;
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Output combines DocumentFileDetail (SAF) or normalized Stat (RNFS) entries
		let output: any[] = [];
		for (let i = 0; i < stats.length; i++) {
			const stat = stats[i];

			const relativePath = toRelativePath(stat);
			const standardStat = this.rnfsStatToStd_(stat, relativePath);
			output.push(standardStat);

			if (isScoped) {
				// readUriDirStatsHandleRecursion_ expects stat to have a URI property.
				// Use the original stat.
				output = await this.readUriDirStatsHandleRecursion_(stat as DocumentFileDetail, output, options);
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
			if (error && (error.code === 'ENOENT' || !(await this.exists(path)))) {
				// Probably { [Error: File does not exist] framesToPop: 1, code: 'EUNSPECIFIED' }
				//     or   { [Error: The file {file} couldn’t be opened because there is no such file.], code: 'ENSCOCOAERRORDOMAIN260' }
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

	public async open(path: string, mode: string) {
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

	public close(_handle: unknown): Promise<void> {
		// Nothing
		return null;
	}

	public readFile(path: string, rawEncoding = 'utf8') {
		const encoding = normalizeEncoding(rawEncoding);

		if (isScopedUri(path)) {
			return RNSAF.readFile(path, { encoding: encoding });
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

	public async readFileChunk(handle: { path: string; offset: number; mode: string; stat: { size: number } | null }, length: number, rawEncoding = 'base64') {
		if (!handle?.stat) {
			throw new JoplinError('File does not exist (reading file chunk).', 'ENOENT');
		}

		const encoding = normalizeEncoding(rawEncoding);

		if (handle.offset + length > handle.stat.size) {
			length = handle.stat.size - handle.offset;
		}

		if (!length) return null;
		const output = await RNFS.read(handle.path, length, handle.offset, encoding);
		// eslint-disable-next-line require-atomic-updates
		handle.offset += length;
		return output ? output : null;
	}

	public resolve(...paths: string[]): string {
		return resolve(...paths);
	}

	public async md5File(path: string): Promise<string> {
		if (isScopedUri(path)) {
			// Warning: Slow
			const fileData = Buffer.from(await this.readFile(path, 'base64'), 'base64');
			return md5(fileData);
		} else {
			return await RNFS.hash(path, 'md5');
		}
	}

	public async tarExtract(options: Omit<Parameters<typeof tarExtract>[0], 'cwd'> & { cwd?: string }) {
		await tarExtract({
			cwd: RNFS.DocumentDirectoryPath,
			...options,
		});
	}

	public async tarCreate(options: Omit<Parameters<typeof tarCreate>[0], 'cwd'> & { cwd?: string }, filePaths: string[]) {
		await tarCreate({
			cwd: RNFS.DocumentDirectoryPath,
			...options,
		}, filePaths);
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

	public getCacheDirectoryPath() {
		return RNFS.CachesDirectoryPath;
	}

	public getAppDirectoryPath() {
		return RNFetchBlob.fs.dirs.DocumentDir;
	}

	public isUsingAndroidSAF() {
		return Platform.OS === 'android' && Platform.Version > 28;
	}

}
