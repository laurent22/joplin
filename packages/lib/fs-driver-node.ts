import { resolve as nodeResolve } from 'path';
import FsDriverBase, { Stat } from './fs-driver-base';
import time from './time';
const md5File = require('md5-file');
const fs = require('fs-extra');

export default class FsDriverNode extends FsDriverBase {

	private fsErrorToJsError_(error: any, path: string = null) {
		let msg = error.toString();
		if (path !== null) msg += `. Path: ${path}`;
		const output: any = new Error(msg);
		if (error.code) output.code = error.code;
		return output;
	}

	public appendFileSync(path: string, string: string) {
		return fs.appendFileSync(path, string);
	}

	public async appendFile(path: string, string: string, encoding = 'base64') {
		try {
			return await fs.appendFile(path, string, { encoding: encoding });
		} catch (error) {
			throw this.fsErrorToJsError_(error, path);
		}
	}

	public async writeFile(path: string, string: string, encoding = 'base64') {
		try {
			if (encoding === 'buffer') {
				return await fs.writeFile(path, string);
			} else {
				return await fs.writeFile(path, string, { encoding: encoding });
			}
		} catch (error) {
			throw this.fsErrorToJsError_(error, path);
		}
	}

	// same as rm -rf
	public async remove(path: string) {
		try {
			const r = await fs.remove(path);
			return r;
		} catch (error) {
			throw this.fsErrorToJsError_(error, path);
		}
	}

	public async move(source: string, dest: string) {
		let lastError = null;

		for (let i = 0; i < 5; i++) {
			try {
				const output = await fs.move(source, dest, { overwrite: true });
				return output;
			} catch (error) {
				lastError = error;
				// Normally cannot happen with the `overwrite` flag but sometime it still does.
				// In this case, retry.
				if (error.code === 'EEXIST') {
					await time.sleep(1);
					continue;
				}
				throw this.fsErrorToJsError_(error);
			}
		}

		throw lastError;
	}

	public exists(path: string) {
		return fs.pathExists(path);
	}

	public async mkdir(path: string) {
		// Note that mkdirp() does not throw an error if the directory
		// could not be created. This would make the synchroniser to
		// incorrectly try to sync with a non-existing dir:
		// https://github.com/laurent22/joplin/issues/2117
		const r = await fs.mkdirp(path);
		if (!(await this.exists(path))) throw new Error(`Could not create directory: ${path}`);
		return r;
	}

	public async stat(path: string) {
		try {
			const stat = await fs.stat(path);
			return {
				birthtime: stat.birthtime,
				mtime: stat.mtime,
				isDirectory: () => stat.isDirectory(),
				path: path,
				size: stat.size,
			};
		} catch (error) {
			if (error.code === 'ENOENT') return null;
			throw error;
		}
	}

	public async setTimestamp(path: string, timestampDate: any) {
		return fs.utimes(path, timestampDate, timestampDate);
	}

	public async readDirStats(path: string, options: any = null) {
		if (!options) options = {};
		if (!('recursive' in options)) options.recursive = false;

		let items = [];
		try {
			items = await fs.readdir(path);
		} catch (error) {
			throw this.fsErrorToJsError_(error);
		}

		let output: Stat[] = [];
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			const stat = await this.stat(`${path}/${item}`);
			if (!stat) continue; // Has been deleted between the readdir() call and now
			stat.path = stat.path.substr(path.length + 1);
			output.push(stat);

			output = await this.readDirStatsHandleRecursion_(path, stat, output, options);
		}
		return output;
	}

	public async open(path: string, mode: any) {
		try {
			return await fs.open(path, mode);
		} catch (error) {
			throw this.fsErrorToJsError_(error, path);
		}
	}

	public async close(handle: any) {
		try {
			return await fs.close(handle);
		} catch (error) {
			throw this.fsErrorToJsError_(error, '');
		}
	}

	public async readFile(path: string, encoding = 'utf8') {
		try {
			if (encoding === 'Buffer') return await fs.readFile(path); // Returns the raw buffer
			return await fs.readFile(path, encoding);
		} catch (error) {
			throw this.fsErrorToJsError_(error, path);
		}
	}

	// Always overwrite destination
	public async copy(source: string, dest: string) {
		try {
			return await fs.copy(source, dest, { overwrite: true });
		} catch (error) {
			throw this.fsErrorToJsError_(error, source);
		}
	}

	public async chmod(source: string, mode: string | number) {
		return fs.chmod(source, mode);
	}

	public async unlink(path: string) {
		try {
			await fs.unlink(path);
		} catch (error) {
			if (error.code === 'ENOENT') return; // Don't throw if the file does not exist
			throw error;
		}
	}

	public async readFileChunk(handle: any, length: number, encoding = 'base64') {
		// let buffer = new Buffer(length);
		let buffer = Buffer.alloc(length);
		const result = await fs.read(handle, buffer, 0, length, null);
		if (!result.bytesRead) return null;
		buffer = buffer.slice(0, result.bytesRead);
		if (encoding === 'base64') return buffer.toString('base64');
		if (encoding === 'ascii') return buffer.toString('ascii');
		throw new Error(`Unsupported encoding: ${encoding}`);
	}

	public resolve(...pathSegments: string[]) {
		return nodeResolve(...pathSegments);
	}

	public async md5File(path: string): Promise<string> {
		return md5File(path);
	}

	public async tarExtract(options: any) {
		await require('tar').extract(options);
	}

	public async tarCreate(options: any, filePaths: string[]) {
		await require('tar').create(options, filePaths);
	}

}
