import { resolve } from 'path';
import FsDriverBase, { ReadDirStatsOptions, RemoveOptions, Stat } from '@joplin/lib/fs-driver-base';
import tarExtract, { TarExtractOptions } from './tarExtract';
import tarCreate, { TarCreateOptions } from './tarCreate';
import { Buffer } from 'buffer';
import Logger, { LogLevel, TargetType } from '@joplin/utils/Logger';
import RemoteMessenger from '@joplin/lib/utils/ipc/RemoteMessenger';
import type { AccessMode, TransferableStat, WorkerApi } from './fs-driver-rn.web.worker';
import WorkerMessenger from '@joplin/lib/utils/ipc/WorkerMessenger';
import JoplinError from '@joplin/lib/JoplinError';

type FileHandle = {
	reader: ReadableStreamDefaultReader<Uint8Array>;
	buffered: Buffer;
	done: boolean;
};

declare global {
	interface FileSystemDirectoryHandle {
		entries(): AsyncIterable<[string, FileSystemFileHandle|FileSystemDirectoryHandle]>;
		keys(): AsyncIterable<string>;
	}
}

const logger = new Logger();
logger.addTarget(TargetType.Console);
logger.setLevel(LogLevel.Warn);

const transferableStatToStat = (stat: TransferableStat): Stat => {
	return {
		mtime: new Date(stat.mtime),
		birthtime: new Date(stat.birthtime),
		size: stat.size,
		path: stat.path,
		isDirectory: () => stat.isDirectory,
	};
};

interface LocalWorkerApi { }
type MessengerType = RemoteMessenger<LocalWorkerApi, WorkerApi>;
let messenger: MessengerType|null = null;

// Ensures that all instances of FsDriverWeb share the same worker. This is important
// for virtual files to be correctly handled.
const getWorkerMessenger = () => {
	if (messenger) {
		return messenger;
	}
	const worker = new Worker(
		// Webpack has special syntax for creating a worker. It requires use
		// of import.meta.url, which is prohibited by TypeScript in CommonJS
		// modules.
		//
		// See also https://github.com/webpack/webpack/discussions/13655#discussioncomment-8382152
		//
		// TODO: Remove this after migrating to ESM.
		//
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- Required for webpack build (see above)
		// @ts-ignore
		new URL('./fs-driver-rn.web.worker.ts', import.meta.url),
	);
	messenger = new WorkerMessenger('fs-worker', worker, {});
	return messenger;
};

export default class FsDriverWeb extends FsDriverBase {
	private messenger_: RemoteMessenger<LocalWorkerApi, WorkerApi>;

	public constructor() {
		super();

		this.messenger_ = getWorkerMessenger();
	}

	public override async writeFile(
		path: string,
		data: string|ArrayBuffer,
		encoding: BufferEncoding|'Buffer' = 'base64',
		options?: FileSystemCreateWritableOptions,
	) {
		await this.messenger_.remoteApi.writeFile(path, data, encoding, options);
	}

	public override async appendFile(path: string, content: string, encoding?: BufferEncoding) {
		return this.writeFile(path, content, encoding, { keepExistingData: true });
	}

	public override async remove(path: string, { recursive = true }: RemoveOptions = {}) {
		await this.messenger_.remoteApi.remove(path, { recursive });
	}

	public override async unlink(path: string) {
		return this.messenger_.remoteApi.unlink(path);
	}

	public async fileAtPath(path: string) {
		try {
			return await this.messenger_.remoteApi.fileAtPath(path);
		} catch (error) {
			if (!await this.exists(path)) {
				throw new JoplinError(`fileAtPath path doesn't exist: ${error}, stack: ${error.stack}`, 'ENOENT');
			}
			throw error;
		}
	}

	public async readFile(path: string, encoding: BufferEncoding|'Buffer' = 'utf-8') {
		logger.debug('readFile', path);
		const file = await this.fileAtPath(path);

		if (encoding === 'utf-8' || encoding === 'utf8') {
			return await file.text();
		} else if (encoding === 'Buffer') {
			return Buffer.from(await file.arrayBuffer());
		} else {
			const buffer = Buffer.from(await file.arrayBuffer());
			return buffer.toString(encoding);
		}
	}

	public override async open(path: string, _mode = 'r'): Promise<FileHandle> {
		const file = await this.fileAtPath(path);
		return {
			// TODO: Extra casting required by NodeJS types conflicting with DOM types.
			reader: (file.stream() as unknown as ReadableStream).getReader(),
			buffered: Buffer.from([]),
			done: false,
		};
	}

	public override async readFileChunkAsBuffer(handle: FileHandle, length: number): Promise<Buffer> {
		let read: Buffer = handle.buffered;

		while (read.byteLength < length && !handle.done) {
			const { done, value } = await handle.reader.read();
			handle.done = done;
			if (value) {
				if (read.byteLength > 0) {
					read = Buffer.concat([read, value], read.byteLength + value.byteLength);
				} else {
					read = Buffer.from(value);
				}
			}
		}

		const result = read.subarray(0, length);
		handle.buffered = read.subarray(length, read.length);
		if (result.length === 0) {
			return null;
		} else {
			return result;
		}
	}

	public override async readFileChunk(handle: FileHandle, length: number, encoding: BufferEncoding = 'base64') {
		return (await this.readFileChunkAsBuffer(handle, length))?.toString(encoding) ?? null;
	}

	public override async close(handle: FileHandle) {
		handle.reader?.releaseLock();
		handle.reader = null;
	}

	public override async mkdir(path: string) {
		logger.debug('mkdir', path);
		await this.messenger_.remoteApi.mkdir(path);
	}

	public override async copy(from: string, to: string) {
		await this.messenger_.remoteApi.copy(from, to);
	}

	public override async stat(path: string): Promise<Stat|null> {
		const stat = await this.messenger_.remoteApi.stat(path);
		if (!stat) return null;
		return transferableStatToStat(stat);
	}

	public override async readDirStats(path: string, options: ReadDirStatsOptions = { recursive: false }): Promise<Stat[]> {
		const stats = (await this.messenger_.remoteApi.readDirStats(path, options))?.map(transferableStatToStat);
		if (!stats) {
			throw new JoplinError(`Path ${path} does not exist (readDirStats)`, 'ENOENT');
		}
		return stats;
	}

	public override async exists(path: string) {
		return await this.messenger_.remoteApi.exists(path);
	}

	public resolve(...paths: string[]): string {
		return resolve(...paths);
	}

	public override async md5File(path: string): Promise<string> {
		return await this.messenger_.remoteApi.md5File(path);
	}

	public override async tarExtract(options: TarExtractOptions) {
		await tarExtract({
			cwd: '/cache/',
			...options,
		});
	}

	public override async tarCreate(options: TarCreateOptions, filePaths: string[]) {
		await tarCreate({
			cwd: '/cache/',
			...options,
		}, filePaths);
	}

	public override getCacheDirectoryPath(): string {
		return '/cache/';
	}

	public override getAppDirectoryPath(): string {
		return '/app/';
	}

	public async createReadOnlyVirtualFile(path: string, content: File) {
		return this.messenger_.remoteApi.createReadOnlyVirtualFile(path, content);
	}

	public async mountExternalDirectory(handle: FileSystemDirectoryHandle, id: string, mode: AccessMode) {
		const externalUri = await this.messenger_.remoteApi.mountExternalDirectory(handle, id, mode);
		logger.info('Mounted handle with ID', id, 'at', externalUri);
		return externalUri;
	}
}

