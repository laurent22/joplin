import { dirname, basename, resolve } from 'path';
import FsDriverBase, { ReadDirStatsOptions, Stat } from '@joplin/lib/fs-driver-base';
import tarExtract, { TarExtractOptions } from './tarExtract';
import tarCreate, { TarCreateOptions } from './tarCreate';
import { Buffer } from 'buffer';
const md5 = require('md5');

type FileHandle = {
	reader: ReadableStreamDefaultReader;
	handle: FileSystemFileHandle;
	buffered: Buffer;
	done: boolean;
};

const removeReservedWords = (path: string) => {
	return path.replace(/(tmp)/g, '_$1');
};

declare global {
	interface FileSystemDirectoryHandle {
		keys(): AsyncIterable<FileSystemFileHandle>;
	}
}

export default class FsDriverWeb extends FsDriverBase {
	private fsRoot_: FileSystemDirectoryHandle;
	private directoryHandleCache_: Map<string, FileSystemDirectoryHandle> = new Map();
	private initPromise_: Promise<void>;

	public constructor() {
		super();
		this.initPromise_ = (async () => {
			console.log('Get root');
			try {
				this.fsRoot_ = await (await navigator.storage.getDirectory()).getDirectoryHandle('joplin-web', { create: true });
			} catch (error) {
				console.error('Failed to create fsDriver:', error);
				throw error;
			}
		})();
	}

	private async pathToDirectoryHandle_(path: string, create: boolean = false): Promise<FileSystemDirectoryHandle> {
		await this.initPromise_;

		if (this.directoryHandleCache_.has(path)) {
			return this.directoryHandleCache_.get(path);
		}

		const parentDirs = dirname(path);
		if (parentDirs && !['/', '.'].includes(parentDirs)) {
			const parent = await this.pathToDirectoryHandle_(parentDirs, create);
			console.log('get dir handle', basename(path));
			const folderName = removeReservedWords(basename(path));

			let handle: FileSystemDirectoryHandle;
			try {
				handle = await parent.getDirectoryHandle(folderName, { create });
				console.log('handle', handle);
			} catch (error) {
				// TODO: Handle this better
				console.warn(error);
				handle = null;
			}

			if (handle) {
				this.directoryHandleCache_.set(path, handle);
			}

			return handle;
		}
		return this.fsRoot_;
	}

	private async pathToFileHandle_(path: string, create = false): Promise<FileSystemFileHandle> {
		await this.initPromise_;

		const parent = await this.pathToDirectoryHandle_(dirname(path));
		console.log('GETname', basename(path))
		try {
			return parent.getFileHandle(removeReservedWords(basename(path)), { create });
		} catch (error) {
			if (!await this.exists(path)) {
				return null;
			} else {
				throw error;
			}
		}
	}

	private async openWriteStream_(path: string, options?: FileSystemCreateWritableOptions) {
		const handle = await this.pathToFileHandle_(path, true);
		const writer = (await handle.createWritable(options)).getWriter();
		await writer.ready;
		return { writer, handle };
	}

	public override async writeFile(
		path: string,
		string: string,
		encoding: BufferEncoding = 'base64',
		options?: FileSystemCreateWritableOptions,
	) {
		const { writer } = await this.openWriteStream_(path, options);
		if (encoding === 'utf-8' || encoding === 'utf8') {
			const encoder = new TextEncoder();
			await writer.write(encoder.encode(string));
		} else {
			await writer.write(Buffer.from(string, encoding).buffer);
		}
		await writer.close();
	}

	public override async appendFile(path: string, content: string, encoding?: BufferEncoding) {
		return this.writeFile(path, content, encoding, { keepExistingData: true });
	}

	public override async remove(path: string) {
		this.directoryHandleCache_.clear();
		const dirHandle = await this.pathToDirectoryHandle_(dirname(path));
		if (dirHandle) {
			await dirHandle.removeEntry(basename(path), { recursive: true });
		} else {
			throw new Error(`ENOENT: Parent directory of path ${JSON.stringify(path)} does not exist.`);
		}
	}

	public async readFile(path: string, encoding: BufferEncoding = 'utf-8') {
		const handle = await this.pathToFileHandle_(path);
		const file = await handle.getFile();
		if (encoding === 'utf-8' || encoding === 'utf8') {
			return await file.text();
		} else {
			const buffer = Buffer.from(await file.arrayBuffer());
			return buffer.toString(encoding);
		}
	}

	public override async open(path: string, _mode: string = 'r'): Promise<FileHandle> {
		const handle = await this.pathToFileHandle_(path);
		return {
			handle,
			// TODO: Extra casting required by NodeJS types conflicting with DOM types.
			reader: ((await handle.getFile()).stream() as unknown as ReadableStream).getReader(),
			buffered: Buffer.from([]),
			done: false,
		};
	}

	public override async readFileChunk(handle: FileHandle, length: number, encoding: BufferEncoding = 'base64') {
		let read: Buffer;

		if (handle.buffered.byteLength < length && !handle.done) {
			const { done, value } = await handle.reader.read();
			handle.done = done;
			read = Buffer.concat([handle.buffered, Buffer.from(value)]);
		} else {
			read = handle.buffered;
		}

		const result = read.subarray(0, length);
		handle.buffered = result.subarray(length);
		return result.toString(encoding);
	}

	public override async close(handle: FileHandle) {
		handle.reader.releaseLock();
	}

	public override async mkdir(path: string) {
		await this.pathToDirectoryHandle_(path, true);
	}

	public override async copy(from: string, to: string) {
		const fromHandle = await this.pathToFileHandle_(from);
		const toHandle = await this.pathToFileHandle_(to, true);

		const fromFile = await fromHandle.getFile();
		const writer = (await toHandle.createWritable()).getWriter();
		writer.write(fromFile);
		writer.close();
	}

	public override async stat(path: string): Promise<Stat> {
		const dirHandle = await this.pathToDirectoryHandle_(path);
		const fileHandle = await this.pathToFileHandle_(path);
		if (!dirHandle && !fileHandle) return null;


		const size = await (async () => {
			if (dirHandle) return 0;
			return (await fileHandle.getFile()).size
		})();

		return {
			birthtime: new Date(0),
			mtime: new Date(0),
			path: path,
			size,
			isDirectory: () => !!dirHandle,
		};
	}

	public override async readDirStats(path: string, options: ReadDirStatsOptions = { recursive: false }): Promise<Stat[]> {
		const dirHandle = await this.pathToDirectoryHandle_(path);
		if (!dirHandle) return null;

		const result: Stat[] = [];
		for await (const child of dirHandle.keys()) {
			const childPath = `${path}/${child}`;
			const stat = await this.stat(childPath);
			result.push(stat);
			if (options.recursive) {
				result.push(...await this.readDirStats(childPath));
			}
		}
		return result;
	}

	public override async exists(path: string) {
		const parentDir = await this.pathToDirectoryHandle_(dirname(path));
		console.log('exists', path);
		if (!parentDir) return false;

		const target = basename(path);
		for await (const key of (parentDir as any).keys()) {
			if (key === target) return true;
		}
		return false;
	}

	public resolve(...paths: string[]): string {
		return resolve(...paths);
	}

	public override async md5File(path: string): Promise<string> {
		const fileData = Buffer.from(await this.readFile(path, 'base64'), 'base64');
		return md5(fileData);
	}

	public override async tarExtract(options: TarExtractOptions) {
		await tarExtract({
			cwd: '.',
			...options,
		});
	}

	public override async tarCreate(options: TarCreateOptions, filePaths: string[]) {
		await tarCreate({
			cwd: '.',
			...options,
		}, filePaths);
	}

	public override getCacheDirectoryPath(): string {
		return '/cache/';	
	}

	public override getAppDirectoryPath(): string {
		return '/app/';
	}
}

