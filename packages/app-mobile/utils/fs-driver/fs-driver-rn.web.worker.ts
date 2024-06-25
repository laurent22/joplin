import type { ReadDirStatsOptions, RemoveOptions } from '@joplin/lib/fs-driver-base';
import WorkerToWindowMessenger from '@joplin/lib/utils/ipc/WorkerToWindowMessenger';
import Logger, { LogLevel, TargetType } from '@joplin/utils/Logger';
import { resolve, dirname, basename, normalize, join } from 'path';
import { Buffer } from 'buffer';
const md5 = require('md5');

const removeReservedWords = (fileName: string) => {
	return fileName.replace(/(tmp)$/g, '_$1');
};

const restoreReservedWords = (fileName: string) => {
	return fileName.replace(/_tmp$/g, 'tmp');
};

declare global {
	interface FileSystemSyncAccessHandle {
		close(): void;
		truncate(to: number): void;
		write(buffer: ArrayBuffer|ArrayBufferView, options?: { at: number }): void;
		read(buffer: ArrayBuffer|ArrayBufferView, options?: { at: number }): number;
		getSize(): number;
		flush(): void;
	}

	interface FileSystemFileHandle {
		createSyncAccessHandle(): Promise<FileSystemSyncAccessHandle>;
	}

	interface FileSystemDirectoryHandle {
		entries(): AsyncIterable<[string, FileSystemFileHandle|FileSystemDirectoryHandle]>;
		keys(): AsyncIterable<string>;
		requestPermission(permission: { mode: string }): Promise<'granted'|string>;
	}
}

type WriteFileOptions = { keepExistingData?: boolean };

const logger = new Logger();
logger.addTarget(TargetType.Console);
logger.setLevel(LogLevel.Debug);

export interface TransferableStat {
	birthtime: number;
	mtime: number;
	path: string;
	size: number;
	isDirectory: boolean;
}

const isNotFoundError = (error: DOMException) => error.name === 'NotFoundError';
const externalDirectoryPrefix = '/mount/';

// eslint-disable-next-line import/prefer-default-export -- This file is an entrypoint -- WorkerApi should only be used as a type.
export class WorkerApi {
	private fsRoot_: FileSystemDirectoryHandle;
	private directoryHandleCache_: Map<string, FileSystemDirectoryHandle> = new Map();
	private virtualFiles_: Map<string, File> = new Map();
	private externalHandles_: Map<string, FileSystemFileHandle|FileSystemDirectoryHandle> = new Map();
	private initPromise_: Promise<void>;

	public constructor() {
		this.initPromise_ = (async () => {
			try {
				this.fsRoot_ = await (await navigator.storage.getDirectory()).getDirectoryHandle('joplin-web', { create: true });
			} catch (error) {
				logger.warn('Failed to create fs-driver:', error);
				throw error;
			}
		})();
	}

	private async pathToDirectoryHandle_(path: string, create = false): Promise<FileSystemDirectoryHandle|null> {
		await this.initPromise_;
		path = resolve('/', path);

		if (path === '/') {
			return this.fsRoot_;
		} else if (path.startsWith(externalDirectoryPrefix)) {
			if (path === externalDirectoryPrefix) {
				// /mount/ is virtual, it doesn't exist.
				return null;
			}

			const handle = this.externalHandles_.get(path);
			if (handle?.kind === 'directory') {
				return handle;
			}
		}

		if (this.directoryHandleCache_.has(path)) {
			logger.debug('pathToDirectoryHandle_ from cache for', path);
			return this.directoryHandleCache_.get(path);
		}
		logger.debug('pathToDirectoryHandle_', 'path:', path, 'create:', create);

		const parentDirs = dirname(path);
		const parent = await this.pathToDirectoryHandle_(parentDirs, create);
		const folderName = removeReservedWords(basename(path));

		let handle: FileSystemDirectoryHandle;
		try {
			handle = await parent.getDirectoryHandle(folderName, { create });
			this.directoryHandleCache_.set(path, handle);
		} catch (error) {
			// TODO: Handle this better
			logger.warn('Error getting directory handle', error, 'for', path, 'create:', create);
			handle = null;
		}

		return handle;
	}

	private async pathToFileHandle_(path: string, create = false): Promise<FileSystemFileHandle> {
		await this.initPromise_;
		path = resolve('/', path);

		if (this.externalHandles_.has(path)) {
			const handle = this.externalHandles_.get(path);
			if (handle.kind !== 'file') {
				throw new Error(`Not a file: ${path}`);
			}
			return handle;
		}

		logger.debug('pathToFileHandle_', 'path:', path, 'create:', create);
		const parent = await this.pathToDirectoryHandle_(dirname(path));
		if (!parent) {
			throw new Error(`Can't get file handle for path ${path} -- parent doesn't exist (create: ${create}).`);
		}

		try {
			return parent.getFileHandle(removeReservedWords(basename(path)), { create });
		} catch (error) {
			logger.warn(error, 'getting file handle at path', path, create);
			if (create) {
				throw new Error(`${error} while getting file at path ${path}.`);
			}

			// TODO: This should return null when a file doesn't exist, but should
			// also report errors in other cases.
			return null;
		}
	}

	public async writeFile(
		path: string,
		data: string|ArrayBuffer,
		encoding: BufferEncoding|'Buffer' = 'base64',
		options?: WriteFileOptions,
	) {
		logger.debug('writeFile', path);
		const handle = await this.pathToFileHandle_(path, true);
		let write, close;
		try {
			const writer = await handle.createSyncAccessHandle();

			let at = 0;
			if (!options?.keepExistingData) {
				writer.truncate(0);
			} else {
				at = writer.getSize();
			}

			write = (data: ArrayBufferLike) => writer.write(data, { at });
			close = () => writer.close();
		} catch (error) {
			// In some cases, createSyncAccessHandle isn't available. In other cases,
			// createWritable isn't available.

			logger.warn('Failed to createSyncAccessHandle', error);
			const writer = await handle.createWritable({ keepExistingData: options?.keepExistingData });
			write = (data: ArrayBufferLike) => writer.write(data);
			close = () => writer.close();
		}

		if (encoding === 'Buffer') {
			write(data as ArrayBuffer);
		} else if (data instanceof ArrayBuffer) {
			throw new Error('Cannot write ArrayBuffer to file without encoding = buffer');
		} else if (encoding === 'utf-8' || encoding === 'utf8') {
			const encoder = new TextEncoder();
			write(encoder.encode(data));
		} else {
			write(Buffer.from(data, encoding).buffer);
		}
		close();
		logger.debug('writeFile done', path);
	}

	public async remove(path: string, { recursive = true }: RemoveOptions = {}) {
		path = normalize(path);

		this.directoryHandleCache_.clear();

		try {
			const dirHandle = await this.pathToDirectoryHandle_(dirname(path));

			if (dirHandle) {
				await dirHandle.removeEntry(basename(path), { recursive });
			} else {
				console.warn(`remove: ENOENT: Parent directory of path ${JSON.stringify(path)} does not exist.`);
			}
		} catch (error) {
			// remove should pass even if the item doesn't exist.
			// This matches the behavior of fs-extra's remove.
			if (!isNotFoundError(error)) {
				throw error;
			}
		}
	}

	public async unlink(path: string) {
		return await this.remove(path, { recursive: false });
	}

	public async fileAtPath(path: string) {
		path = normalize(path);

		let file: File;
		if (this.virtualFiles_.has(path)) {
			file = this.virtualFiles_.get(path);
		} else {
			const handle = await this.pathToFileHandle_(path);
			file = await handle.getFile();
		}
		return file;
	}

	public async readFile(path: string, encoding: BufferEncoding = 'utf-8') {
		path = normalize(path);
		logger.debug('readFile', path);
		const file = await this.fileAtPath(path);

		if (encoding === 'utf-8' || encoding === 'utf8') {
			return await file.text();
		} else {
			const buffer = Buffer.from(await file.arrayBuffer());
			return buffer.toString(encoding);
		}
	}

	public async mkdir(path: string) {
		if (path === externalDirectoryPrefix) {
			return;
		}

		logger.debug('mkdir', path);
		await this.pathToDirectoryHandle_(path, true);
	}

	public async copy(from: string, to: string) {
		logger.debug('copy', from, to);
		const fromFile = await this.fileAtPath(from);
		await this.writeFile(to, await fromFile.arrayBuffer(), 'Buffer');
	}

	public async stat(path: string, handle?: FileSystemDirectoryHandle|FileSystemFileHandle): Promise<TransferableStat|null> {
		logger.debug('stat', path, handle ? 'with handle' : '');
		handle ??= await this.pathToDirectoryHandle_(path);
		try {
			handle ??= await this.pathToFileHandle_(path);
		} catch (error) {
			// Should return null when a file isn't found.
			if (!isNotFoundError(error)) {
				throw error;
			}
		}
		const virtualFile = this.virtualFiles_.get(normalize(path));

		if (!handle && !virtualFile) return null;
		logger.debug('has handle');

		const size = await (async () => {
			if (handle.kind === 'directory') return 0;
			return (virtualFile ?? await handle.getFile()).size;
		})();

		return {
			birthtime: 0,
			mtime: 0,
			// Can't normalize protocol URIs (e.g. external:///foo)
			path: path.match(/^[a-z]+:/) ? path : normalize(path),
			size,
			isDirectory: handle.kind === 'directory',
		};
	}

	public async readDirStats(path: string, options: ReadDirStatsOptions = { recursive: false }): Promise<TransferableStat[]> {
		const readDirStats = async (basePath: string, path: string, dirHandle?: FileSystemDirectoryHandle) => {
			dirHandle ??= await this.pathToDirectoryHandle_(path);
			if (!dirHandle) return null;

			const result: TransferableStat[] = [];
			try {
				for await (const [childInternalName, childHandle] of dirHandle.entries()) {
					const childFileName = restoreReservedWords(childInternalName);
					const childPath = join(path, childFileName);

					const stat = await this.stat(childPath, childHandle);
					result.push({ ...stat, path: join(basePath, childFileName) });

					if (options.recursive && childHandle.kind === 'directory') {
						const childBasePath = join(basePath, childFileName);
						result.push(...await readDirStats(childBasePath, childPath, childHandle));
					}
				}
			} catch (error) {
				throw new Error(`readDirStats error: ${error}, path: ${basePath},${path}`);
			}
			return result;
		};
		return readDirStats('', path);
	}

	public async exists(path: string) {
		logger.debug('exists?', path);
		path = resolve('/', path);

		if (this.virtualFiles_.has(path) || this.externalHandles_.has(path)) {
			return true;
		}

		const parentDir = await this.pathToDirectoryHandle_(dirname(path));
		if (!parentDir) return false;

		const target = basename(path);
		for await (const key of parentDir.keys()) {
			if (key === target) return true;
		}
		return false;
	}

	public async md5File(path: string): Promise<string> {
		const fileData = Buffer.from(await (await this.fileAtPath(path)).arrayBuffer());
		return md5(fileData);
	}

	public async createReadOnlyVirtualFile(path: string, content: File) {
		this.virtualFiles_.set(normalize(path), content);
	}

	public async mountExternalDirectory(handle: FileSystemDirectoryHandle, _id: string) {
		if (await handle.requestPermission({ mode: 'readwrite' }) !== 'granted') {
			throw new Error('Write access is needed.');
		}

		const mountPath = resolve('/mount/', crypto.randomUUID().replace(/-/g, ''));
		this.externalHandles_.set(mountPath, handle);
		return mountPath;
	}
}

interface RemoteApi { }
new WorkerToWindowMessenger<WorkerApi, RemoteApi>('fs-worker', new WorkerApi());
