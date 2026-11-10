// Browser paths use POSIX separators even when Jest runs on Windows.
jest.mock('path', () => jest.requireActual('path').posix);
jest.mock('@joplin/lib/utils/ipc/WorkerToWindowMessenger', () => ({
	__esModule: true,
	default: jest.fn(),
}));

import type { WorkerApi as WorkerApiType } from './fs-driver-rn.web.worker';

type SyncAccessHandle = Awaited<ReturnType<FileSystemFileHandle['createSyncAccessHandle']>>;

describe('fs-driver-rn.web.worker', () => {
	let WorkerApi: typeof import('./fs-driver-rn.web.worker').WorkerApi;
	let originalNavigator: PropertyDescriptor|undefined;
	let originalIndexedDb: PropertyDescriptor|undefined;

	beforeAll(async () => {
		originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
		originalIndexedDb = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
		// Module initialization creates an unused worker API instance.
		Object.defineProperty(globalThis, 'navigator', {
			configurable: true,
			value: { storage: { getDirectory: async () => ({ getDirectoryHandle: async () => ({}) }) } },
		});
		Object.defineProperty(globalThis, 'indexedDB', {
			configurable: true,
			value: { open: () => {
				const request: { result: object; onsuccess?: ()=> void } = { result: {} };
				queueMicrotask(() => request.onsuccess?.());
				return request;
			} },
		});
		({ WorkerApi } = await import('./fs-driver-rn.web.worker'));
	});

	afterAll(() => {
		if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
		else delete (globalThis as { navigator?: Navigator }).navigator;
		if (originalIndexedDb) Object.defineProperty(globalThis, 'indexedDB', originalIndexedDb);
		else delete (globalThis as { indexedDB?: IDBFactory }).indexedDB;
	});

	const makeWorker = (writer: SyncAccessHandle): WorkerApiType => {
		const file = { createSyncAccessHandle: async () => writer } as FileSystemFileHandle;
		const cache = { getFileHandle: async () => file } as unknown as FileSystemDirectoryHandle;
		const root = { getDirectoryHandle: async () => cache } as unknown as FileSystemDirectoryHandle;
		return Object.assign(Object.create(WorkerApi.prototype), {
			fsRoot_: root,
			initPromise_: Promise.resolve(),
			directoryHandleCache_: new Map(),
			virtualFiles_: new Map(),
			externalHandles_: new Map(),
		}) as WorkerApiType;
	};

	const makeFile = (content: string) => ({
		kind: 'file',
		getFile: async () => ({ size: content.length, lastModified: 0, text: async () => content }),
	}) as unknown as FileSystemFileHandle;

	const makeDirectory = (children: Map<string, FileSystemFileHandle|FileSystemDirectoryHandle>) => ({
		kind: 'directory',
		entries: async function* () { yield* children; },
		getDirectoryHandle: async (name: string) => children.get(name),
		getFileHandle: async (name: string) => children.get(name),
		removeEntry: jest.fn(async (name: string) => { children.delete(name); }),
	}) as unknown as FileSystemDirectoryHandle & { removeEntry: jest.Mock };

	const makeMoveWorker = (maxBytesPerWrite: number) => {
		const sourceBytes = new Uint8Array([1, 2, 3, 4, 5]);
		const destinationBytes = new Uint8Array(sourceBytes.length);
		const writer = {
			truncate: jest.fn(),
			write: jest.fn((data: ArrayBufferView, options: { at: number }) => {
				const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
				const count = Math.min(maxBytesPerWrite, bytes.byteLength);
				destinationBytes.set(bytes.subarray(0, count), options.at);
				return count;
			}),
			close: jest.fn(),
		};
		const source = { getFile: async () => ({ arrayBuffer: async () => sourceBytes.buffer }) } as FileSystemFileHandle;
		// Safari can provide a synchronous access handle without createWritable.
		const destination = { createSyncAccessHandle: async () => writer } as unknown as FileSystemFileHandle;
		const files = new Map([['note.html._tmp', source], ['note.html', destination]]);
		const cache = {
			getFileHandle: async (name: string) => files.get(name),
			removeEntry: jest.fn(async (name: string) => { files.delete(name); }),
		};
		const root = { getDirectoryHandle: async () => cache };
		const worker = makeWorker(writer as unknown as SyncAccessHandle);
		Object.assign(worker, { fsRoot_: root });
		return { worker, sourceBytes, destinationBytes, files, cache };
	};

	it('retries partial writes until all bytes have been written', async () => {
		const source = new Uint8Array([1, 2, 3, 4, 5]);
		const destination = new Uint8Array(source.length);
		const writer = {
			truncate: jest.fn(),
			write: jest.fn((data: ArrayBufferView, options: { at: number }) => {
				const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
				const count = Math.min(2, bytes.byteLength);
				destination.set(bytes.subarray(0, count), options.at);
				return count;
			}),
			close: jest.fn(),
		};

		await makeWorker(writer as unknown as SyncAccessHandle).writeFile('/cache/out', source.buffer as ArrayBuffer, 'Buffer');
		expect(destination).toEqual(source);
		expect(writer.write).toHaveBeenCalledTimes(3);
		expect(writer.close).toHaveBeenCalledTimes(1);
	});

	it('rejects a zero-byte write', async () => {
		const writer = { truncate: jest.fn(), write: jest.fn(() => 0), close: jest.fn() };
		await expect(makeWorker(writer as unknown as SyncAccessHandle).writeFile('/cache/out', new Uint8Array([1]).buffer as ArrayBuffer, 'Buffer')).rejects.toThrow();
		expect(writer.close).toHaveBeenCalledTimes(1);
	});

	it('moves an HTML export using a synchronous access handle', async () => {
		const { worker, sourceBytes, destinationBytes, files, cache } = makeMoveWorker(2);
		await worker.move('/cache/note.html.tmp', '/cache/note.html');
		expect(destinationBytes).toEqual(sourceBytes);
		expect(cache.removeEntry).toHaveBeenCalledWith('note.html._tmp', { recursive: false });
		expect(files.has('note.html._tmp')).toBe(false);
	});

	it('keeps the source when a move cannot finish writing', async () => {
		const { worker, files, cache } = makeMoveWorker(0);
		await expect(worker.move('/cache/note.html.tmp', '/cache/note.html')).rejects.toThrow();
		expect(cache.removeEntry).not.toHaveBeenCalled();
		expect(files.has('note.html._tmp')).toBe(true);
	});

	it('preserves distinct names in mounted directories', async () => {
		const files = new Map<string, FileSystemFileHandle|FileSystemDirectoryHandle>([
			['report.tmp', makeFile('original')],
			['report._tmp', makeFile('encoded')],
		]);
		const external = makeDirectory(files);
		const worker = makeWorker({} as SyncAccessHandle);
		Object.assign(worker, { externalHandles_: new Map([['/external/mount', external]]) });

		expect((await worker.readDirStats('/external/mount')).map(file => file.path)).toEqual(['report.tmp', 'report._tmp']);
		expect(await worker.exists('/external/mount/report.tmp')).toBe(true);
		expect(await worker.exists('/external/mount/report._tmp')).toBe(true);
		expect(await worker.readFile('/external/mount/report.tmp')).toBe('original');
		expect(await worker.readFile('/external/mount/report._tmp')).toBe('encoded');
		await worker.unlink('/external/mount/report.tmp');
		expect(external.removeEntry).toHaveBeenCalledWith('report.tmp', { recursive: false });
		expect(await worker.exists('/external/mount/report._tmp')).toBe(true);
		expect(files.has('report._tmp')).toBe(true);
	});

	it('keeps access to encoded app-storage names', async () => {
		const files = new Map<string, FileSystemFileHandle|FileSystemDirectoryHandle>([['note._tmp', makeFile('cached')]]);
		const cache = makeDirectory(files);
		const root = makeDirectory(new Map([['cache', cache]]));
		const worker = makeWorker({} as SyncAccessHandle);
		Object.assign(worker, { fsRoot_: root });

		expect((await worker.readDirStats('/cache')).map(file => file.path)).toEqual(['note.tmp']);
		expect(await worker.readFile('/cache/note.tmp')).toBe('cached');
		await worker.unlink('/cache/note.tmp');
		expect(cache.removeEntry).toHaveBeenCalledWith('note._tmp', { recursive: false });
	});
});
