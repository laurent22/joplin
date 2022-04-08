import { ReadDirStatsOptions } from '@joplin/lib/fs-driver-base';
import { fileExtension, filename } from '@joplin/lib/path-utils';
import time from '@joplin/lib/time';
import FsDriverRN from './fs-driver-rn';
const RNSS = require('react-native-scoped-storage');

type StatResult = {
	/** document path */
	path: string;
	/** document uri */
	uri: string;
	/** document name */
	name: string;
	/** type of document */
	type: 'directory' | 'file';
	/** if document is a file */
	mime?: string;
  /** if document is a file, length in bytes */
	size?: number;
	/** last modified date in milliseconds */
	lastModified: number;
};

const ANDROID_URI_PREFIX = 'content://';

function isScopedUri(path: string) {
	return path.includes(ANDROID_URI_PREFIX);
}

export function normalizePath(path: string) {
	if (!path.startsWith(ANDROID_URI_PREFIX)) return path;

	const baseUriParts = decodeURIComponent(path).split(':');
	if (baseUriParts.length > 2) {
		return `${baseUriParts[0]}:${baseUriParts[1]}${encodeURIComponent(`:${baseUriParts.slice(2).join(':')}`)}`;
	} else {
		throw new Error('selecting root folder is not supported');
	}
}

function getAllPossibleDirCreations(normalizedPath: string) {
	const baseUriParts = decodeURIComponent(normalizedPath).split(':');
	if (baseUriParts.length > 2) {
		const uris = baseUriParts[2].split('/').reduce((accumulator, dirName)=> {
			const parentUri = accumulator.length ? `${accumulator[accumulator.length - 1][0]}/${accumulator[accumulator.length - 1][1]}` : `${baseUriParts[0]}:${baseUriParts[1]}`;
			accumulator.push([parentUri, dirName]);
			return accumulator;
		}, []);
		return uris;
	} else {
		return [];
	}
}


// fs file driver for android api 29+ with fallback to fs-driver-rn whenever necessary
export default class FsDriverAndroid extends FsDriverRN {

	// Encoding can be either "utf8" or "base64"
	// @ts-ignore
	public appendFile(path: string, content: any, encoding = 'base64') {
		if (isScopedUri(path)) {
			return RNSS.writeFile(normalizePath(path), null, null, content, encoding, true);
		}
		return super.appendFile(path, content, encoding);
	}

	// Encoding can be either "utf8" or "base64"
	// @ts-ignore
	public writeFile(path: string, content: any, encoding = 'base64') {
		if (isScopedUri(path)) {
			return RNSS.writeFile(normalizePath(path), null, null, content, encoding);
		}

		return super.writeFile(path, content, encoding);
	}


	public async readDirStats(path: string, options: ReadDirStatsOptions = null): Promise<StatResult[]> {
		if (!options) options = { recursive: false };
		if (!('recursive' in options)) options.recursive = false;

		if (!isScopedUri(path)) {
			return super.readDirStats(path, options);
		}

		let items: StatResult[] = [];
		try {
			items = await RNSS.listFiles(normalizePath(path));
		} catch (error) {
			throw new Error(`Could not read directory: ${path}: ${error.message}`);
		}

		let output: StatResult[] = [];
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			output.push(item);

			output = await this.readUriDirStatsHandleRecursion_(item, output, options);
		}
		return output;
	}

	public async move(source: string, dest: string) {
		if (isScopedUri(source) && isScopedUri(dest)) {
			await this.writeFile(dest, this.readFile(source));
			await this.unlink(source);
		} else if (isScopedUri(source) || isScopedUri(dest)) {
			throw new Error('Move between different storage types not supported');
		}
		return super.move(source, dest);
	}

	public async exists(path: string) {
		if (isScopedUri(path)) {
			try {
				// TODO: fix when module exposes exists()
				await this.mkdir(path);
				return true;
			} catch (e) {
				return false;
			}
		}
		return super.exists(path);
	}

	public async mkdir(path: string) {
		if (isScopedUri(path)) {
			/** recursivly try to make directories after id part of content url */
			const dirCreations = getAllPossibleDirCreations(normalizePath(path)).slice(1);
			for (const entry of dirCreations) {
				await RNSS.createDirectory(entry[0], entry[1]);
			}
			return;
		}
		return super.mkdir(path);
	}

	// @ts-ignore
	public async stat(path: string): Promise<StatResult> {
		try {
			return RNSS.stat(normalizePath(path));
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

	public async open(path: string, mode: number) {
		if (isScopedUri(path)) {
			throw new Error('open() not implemented in FsDriverAndroid');
		}
		return super.open(path, mode);
	}

	public readFile(path: string, encoding = 'utf8') {
		if (isScopedUri(path)) {
			if (encoding === 'Buffer') throw new Error('Raw buffer output not supported for FsDriverAndroid.readFile');
			return RNSS.readFile(normalizePath(path), encoding);
		}
		return super.readFile(path);
	}

	// Always overwrite destination
	public async copy(source: string, dest: string) {
		if (isScopedUri(source) && isScopedUri(dest)) {
			await this.writeFile(dest, this.readFile(source));
		} else if (isScopedUri(source) || isScopedUri(dest)) {
			throw new Error('Move between different storage types not supported');
		}
		return super.copy(source, dest);
	}

	public async unlink(path: string) {
		if (isScopedUri(path)) {
			return await RNSS.deleteFile(normalizePath(path));
		}
		return super.unlink(path);
	}

	// @ts-ignore
	// eslint-disable-next-line
	public async readFileChunk(handle: any, length: number, encoding = 'base64') {
		throw new Error('Not implemented: readFileChunk()');
	}

	public async isDirectory(path: string): Promise<boolean> {
		if (isScopedUri(path)) {
			const stat = await this.stat(path);
			return stat.type === 'directory';
		}
		return super.stat(path).then(result => result.isDirectory());
	}

	protected async readUriDirStatsHandleRecursion_(stat: StatResult, output: StatResult[], options: ReadDirStatsOptions): Promise<StatResult[]> {
		if (options.recursive && stat.type === 'directory') {
			const subStats = await this.readDirStats(stat.uri, options);
			for (let j = 0; j < subStats.length; j++) {
				const subStat = subStats[j];
				output.push(subStat);
			}
		}

		return output;
	}

	public async findUniqueFilename(name: string, reservedNames: string[] = null, markdownSafe: boolean = false): Promise<string> {
		if (reservedNames === null) {
			reservedNames = [];
		}
		let counter = 1;

		const nameNoExt = filename(name, true);
		let extension = fileExtension(name);
		if (extension) extension = `.${extension}`;
		let nameToTry = nameNoExt + extension;
		while (true) {
			// Check if the filename does not exist in the filesystem and is not reserved
			const exists = await this.exists(nameToTry) || reservedNames.includes(nameToTry);
			if (!exists) return nameToTry;
			if (!markdownSafe) {
				nameToTry = `${nameNoExt} (${counter})${extension}`;
			} else {
				nameToTry = `${nameNoExt}-${counter}${extension}`;
			}
			counter++;
			if (counter >= 1000) {
				nameToTry = `${nameNoExt} (${new Date().getTime()})${extension}`;
				await time.msleep(10);
			}
			if (counter >= 1100) throw new Error('Cannot find unique filename');
		}
	}


}
