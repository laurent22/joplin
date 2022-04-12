import { ReadDirStatsOptions } from '@joplin/lib/fs-driver-base';
import { fileExtension, filename } from '@joplin/lib/path-utils';
import time from '@joplin/lib/time';
import FsDriverRN from './fs-driver-rn';
import RNSAF, { Encoding, DocumentFileDetails } from 'react-native-saf-x';

const ANDROID_URI_PREFIX = 'content://';

function isScopedUri(path: string) {
	return path.includes(ANDROID_URI_PREFIX);
}

// fs file driver for android api 29+ with fallback to fs-driver-rn whenever necessary
export default class FsDriverAndroid extends FsDriverRN {

	// Encoding can be either "utf8" or "base64"
	// @ts-ignore
	public appendFile(path: string, content: any, encoding = 'base64') {
		if (isScopedUri(path)) {
			return RNSAF.writeFile(path, content, { encoding: encoding as Encoding, append: true });
		}
		return super.appendFile(path, content, encoding);
	}

	// Encoding can be either "utf8" or "base64"
	// @ts-ignore
	public writeFile(path: string, content: any, encoding = 'base64') {
		if (isScopedUri(path)) {
			return RNSAF.writeFile(path, content, { encoding: encoding as Encoding });
		}

		return super.writeFile(path, content, encoding);
	}


	public async readDirStats(path: string, options: ReadDirStatsOptions = null): Promise<DocumentFileDetails[]> {
		if (!options) options = { recursive: false };
		if (!('recursive' in options)) options.recursive = false;

		if (!isScopedUri(path)) {
			return super.readDirStats(path, options);
		}

		let stats: DocumentFileDetails[] = [];
		try {
			stats = await RNSAF.listFiles(path);
		} catch (error) {
			throw new Error(`Could not read directory: ${path}: ${error.message}`);
		}

		let output: DocumentFileDetails[] = [];
		for (let i = 0; i < stats.length; i++) {
			const stat = stats[i];
			const relativePath = stat.uri.substring(path.length + 1);
			output.push({ ...stat, uri: relativePath });
			output = await this.readUriDirStatsHandleRecursion_(stat, output, options);
		}
		return output;
	}

	public async move(source: string, dest: string) {
		if (isScopedUri(source) && isScopedUri(dest)) {
			await RNSAF.moveFile(source, dest, { replaceIfDestinationExists: true });
		} else if (isScopedUri(source) || isScopedUri(dest)) {
			throw new Error('Move between different storage types not supported');
		}
		return super.move(source, dest);
	}

	public async exists(path: string) {
		if (isScopedUri(path)) {
			return RNSAF.exists(path);
		}
		return super.exists(path);
	}

	public async mkdir(path: string) {
		if (isScopedUri(path)) {
			await RNSAF.mkdir(path);
			return;
		}
		return super.mkdir(path);
	}

	// @ts-ignore
	public async stat(path: string): Promise<DocumentFileDetails> {
		try {
			return RNSAF.stat(path);
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
			return RNSAF.readFile(path, { encoding: encoding as Encoding });
		}
		return super.readFile(path);
	}

	// Always overwrite destination
	public async copy(source: string, dest: string) {
		if (isScopedUri(source) && isScopedUri(dest)) {
			await RNSAF.copyFile(source, dest, { replaceIfDestinationExists: true });
		} else if (isScopedUri(source) || isScopedUri(dest)) {
			throw new Error('Move between different storage types not supported');
		}
		return super.copy(source, dest);
	}

	public async unlink(path: string) {
		if (isScopedUri(path)) {
			await RNSAF.unlink(path);
			return;
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

	protected async readUriDirStatsHandleRecursion_(stat: DocumentFileDetails, output: DocumentFileDetails[], options: ReadDirStatsOptions): Promise<DocumentFileDetails[]> {
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
