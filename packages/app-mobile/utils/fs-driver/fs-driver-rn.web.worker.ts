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

export type AccessMode = 'read'|'readwrite';

declare global {
	interface FileSystemSyncAccessHandle {
		close(): void;
		truncate(to: number): void;
		write(buffer: ArrayBuffer|ArrayBufferView, options?: { at: number }): void;
		read(buffer: ArrayBuffer|ArrayBufferView, options?: { at: number }): number;
		getSize(): number;
		flush(): void;
	}

	interface FileSystemHandle {
		requestPermission(permission: { mode: AccessMode }): Promise<'granted'|string>;
		queryPermission(permission: { mode: AccessMode }): Promise<'granted'|string>;
	}

	interface FileSystemFileHandle {
		createSyncAccessHandle(): Promise<FileSystemSyncAccessHandle>;
	}

	interface FileSystemDirectoryHandle {
		entries(): AsyncIterable<[string, FileSystemFileHandle|FileSystemDirectoryHandle]>;
		keys(): AsyncIterable<string>;
	}
}

type WriteFileOptions = { keepExistingData?: boolean };

const logger = new Logger();
logger.addTarget(TargetType.Console);
logger.setLevel(LogLevel.Info);

export interface TransferableStat {
	birthtime: number;
	mtime: number;
	path: string;
	size: number;
	isDirectory: boolean;
}

const isNotFoundError = (error: DOMException) => error.name === 'NotFoundError';
const isTypeMismatchError = (error: DOMException) => error.name === 'TypeMismatchError';
const externalDirectoryPrefix = '/external/';

type AccessHandleDatabaseControl = {
	clearExternalHandle(id: string): Promise<void>;
	addExternalHandle(path: string, id: string, handle: FileSystemDirectoryHandle|FileSystemFileHandle, mode: AccessMode): Promise<void>;
	queryExternalHandle(path: string): Promise<[FileSystemDirectoryHandle|FileSystemFileHandle, AccessMode]|null>;
};

// Allows saving and restoring file system access handles. These handles are browser-serializable, so can
// be written to indexedDB. Here, indexedDB is used, rather than localStorage or SQLite because:
// - localStorage only accepts string values (see https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem)
// - SQLite stores objects in a custom database, and so almost certainly can't store file system handles.
const createAccessHandleDatabase = async (): Promise<AccessHandleDatabaseControl> => {
	const db = await new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open('fs-storage', 1);
		request.onsuccess = () => {
			resolve(request.result as IDBDatabase);
		};

		request.onerror = (event) => {
			reject(new Error(`Failed to open database: ${event}`));
		};

		request.onupgradeneeded = (event) => {
			if (!('result' in event.target)) {
				reject(new Error('Invalid upgrade event type'));
				return;
			}
			const db = event.target.result as IDBDatabase;
			const store = db.createObjectStore('external-handles', { keyPath: 'id' });
			store.createIndex('id', 'id', { unique: true });
			store.createIndex('path', 'path');
		};
	});

	const toUniquePath = (path: string) => {
		// normalize can leave the trailing /
		return normalize(path).replace(/[/]$/, '');
	};

	return {
		clearExternalHandle(id: string) {
			return new Promise<void>((resolve, reject) => {
				const request = db.transaction(['external-handles'], 'readwrite')
					.objectStore('external-handles')
					.delete(`id:${id}`);

				request.onsuccess = () => resolve();
				request.onerror = (event) => reject(new Error(`Transaction failed: ${event}`));
			});
		},
		addExternalHandle(path: string, id: string, handle: FileSystemDirectoryHandle|FileSystemFileHandle, mode: AccessMode) {
			path = toUniquePath(path);

			return new Promise<void>((resolve, reject) => {
				const request = db.transaction(['external-handles'], 'readwrite')
					.objectStore('external-handles')
					.put({ path, id: `id:${id}`, handle, mode });

				request.onsuccess = () => resolve();
				request.onerror = (event) => reject(new Error(`Transaction failed: ${event}`));
			});
		},
		queryExternalHandle(path: string) {
			path = toUniquePath(path);

			return new Promise<[FileSystemDirectoryHandle|FileSystemFileHandle, AccessMode]|null>((resolve, reject) => {
				const request = db.transaction(['external-handles'], 'readonly')
					.objectStore('external-handles')
					.index('path')
					.get(path);

				request.onsuccess = () => {
					const handle = request.result?.handle;
					if (request.result && request.result.path !== path) {
						throw new Error(`Path mismatch when querying external directory handle: ${JSON.stringify(path)} was ${JSON.stringify(request.result.path)}`);
					}
					resolve(handle ? [handle, request.result?.mode ?? 'readwrite'] : null);
				};
				request.onerror = (event) => reject(new Error(`Transaction failed: ${event}`));
			});
		},
	};
};

export class WorkerApi {
	private fsRoot_: FileSystemDirectoryHandle;
	private accessHandleDatabase_: AccessHandleDatabaseControl;

	private directoryHandleCache_: Map<string, FileSystemDirectoryHandle> = new Map();
	private virtualFiles_: Map<string, File> = new Map();
	private externalHandles_: Map<string, FileSystemFileHandle|FileSystemDirectoryHandle> = new Map();
	private initPromise_: Promise<void>;

	public constructor() {
		this.initPromise_ = (async () => {
			let lastError: Error|null = null;
			for (let retry = 0; retry < 2; retry++) {
				try {
					this.fsRoot_ ??= await (await navigator.storage.getDirectory()).getDirectoryHandle('joplin-web', { create: true });
					this.accessHandleDatabase_ ??= await createAccessHandleDatabase();
					lastError = null;
					break;
				} catch (error) {
					logger.warn('Failed to create fs-driver:', error, `(retry: ${retry})`);
					lastError = error;

					await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
				}
			}

			if (lastError) {
				throw lastError;
			}
		})();
	}

	private async getExternalHandle_(path: string) {
		path = normalize(path);

		if (!path.startsWith(externalDirectoryPrefix)) {
			return null;
		}

		if (this.externalHandles_.has(path)) {
			return this.externalHandles_.get(path);
		}

		const saved = await this.accessHandleDatabase_.queryExternalHandle(path);
		if (!saved) {
			logger.debug('External lookup failed for', path);
			return null;
		}
		const [handle, mode] = saved;

		// At present, not all browsers support .queryPermission and .requestPermission on
		// saved file handles.
		if (!('queryPermission' in handle)) {
			logger.warn('Browser does not support .queryPermission. Loading path: ', path);
			return null;
		}

		const permission = { mode };
		if (await handle.queryPermission(permission) !== 'granted' && await handle.requestPermission(permission) !== 'granted') {
			throw new Error('Missing read-write access. It might be necessary to share the folder with the application again.');
		}

		this.externalHandles_.set(path, handle);
		return handle;
	}

	private async pathToDirectoryHandle_(path: string, create = false): Promise<FileSystemDirectoryHandle|null> {
		await this.initPromise_;
		path = resolve('/', path);

		if (path === '/') {
			return this.fsRoot_;
		} else if (`${path}/`.startsWith(externalDirectoryPrefix)) {
			if (path === externalDirectoryPrefix || `${path}/` === externalDirectoryPrefix) {
				// /external/ is virtual, it doesn't exist.
				return null;
			}

			const handle = await this.getExternalHandle_(path);
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
			const handle = await this.externalHandles_.get(path);
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
			if (create) {
				throw new Error(`${error} while getting file at path ${path}.`);
			}

			if (isNotFoundError(error)) {
				return null;
			}

			logger.warn(error, 'getting file handle at path', path, create);
			throw error;
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
				await write(data as ArrayBuffer);
			} else if (data instanceof ArrayBuffer) {
				throw new Error('Cannot write ArrayBuffer to file without encoding = buffer');
			} else if (encoding === 'utf-8' || encoding === 'utf8') {
				const encoder = new TextEncoder();
				await write(encoder.encode(data));
			} else {
				await write(Buffer.from(data, encoding).buffer);
			}
		} finally {
			if (close) {
				await close();
			}
		}
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

		const file = await (async () => {
			if (handle.kind === 'directory') return null;
			return virtualFile ?? await handle.getFile();
		})();
		const lastModifiedTime = file?.lastModified ?? 0;

		return {
			birthtime: lastModifiedTime,
			mtime: lastModifiedTime,
			// Can't normalize protocol URIs (e.g. external:///foo)
			path: path.match(/^[a-z]+:/) ? path : normalize(path),
			size: file?.size ?? 0,
			isDirectory: handle.kind === 'directory',
		};
	}

	public async readDirStats(path: string, options: ReadDirStatsOptions = { recursive: false }): Promise<TransferableStat[]|null> {
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
				if (isNotFoundError(error)) {
					return null;
				} else {
					throw new Error(`readDirStats error: ${error}, path: ${basePath},${path}`);
				}
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

		const parentDirectory = await this.pathToDirectoryHandle_(dirname(path));
		if (!parentDirectory) return false;

		const fileName = removeReservedWords(basename(path));
		try {
			const childHandle = await parentDirectory.getFileHandle(fileName);
			return !!childHandle;
		} catch (error) {
			if (isNotFoundError(error)) {
				return false;
			} else if (isTypeMismatchError(error)) {
				// A file was requested, so the path is a directory.
				return true;
			}

			throw error;
		}
	}

	public async md5File(path: string): Promise<string> {
		const fileData = Buffer.from(await (await this.fileAtPath(path)).arrayBuffer());
		return md5(fileData);
	}

	public async createReadOnlyVirtualFile(path: string, content: File) {
		this.virtualFiles_.set(normalize(path), content);
	}

	public async mountExternalDirectory(handle: FileSystemDirectoryHandle, id: string, mode: AccessMode) {
		if (await handle.requestPermission({ mode }) !== 'granted') {
			throw new Error(`${mode} access is needed for ${id}.`);
		}

		const mountPath = resolve(externalDirectoryPrefix, crypto.randomUUID().replace(/-/g, ''));
		this.externalHandles_.set(mountPath, handle);

		await this.accessHandleDatabase_.clearExternalHandle(id);
		await this.accessHandleDatabase_.addExternalHandle(mountPath, id, handle, mode);

		return mountPath;
	}
}

interface RemoteApi { }
new WorkerToWindowMessenger<WorkerApi, RemoteApi>('fs-worker', new WorkerApi());
