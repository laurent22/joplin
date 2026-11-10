import type { WorkerApi as WorkerApiType } from './fs-driver-rn.web.worker';

// The web bundle uses POSIX paths. Node's Windows path implementation would
// otherwise recurse when the worker resolves its virtual root directory.
jest.mock('path', () => jest.requireActual('path').posix);
jest.mock('@joplin/lib/utils/ipc/WorkerToWindowMessenger', () => ({
	__esModule: true,
	default: jest.fn(),
}));

describe('fs-driver-rn.web.worker', () => {
	let WorkerApi: typeof WorkerApiType;
	let originalNavigator: PropertyDescriptor|undefined;
	let originalIndexedDb: PropertyDescriptor|undefined;

	beforeAll(async () => {
		originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
		originalIndexedDb = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');

		// The worker creates an API instance when the module loads. Provide enough of
		// the browser APIs to let that unused instance initialize.
		Object.defineProperty(globalThis, 'navigator', {
			configurable: true,
			value: { storage: { getDirectory: async () => ({ getDirectoryHandle: async () => ({}) }) } },
		});
		Object.defineProperty(globalThis, 'indexedDB', {
			configurable: true,
			value: {
				open: () => {
					const request: { result: object; onsuccess?: ()=> void } = { result: {} };
					queueMicrotask(() => request.onsuccess?.());
					return request;
				},
			},
		});

		({ WorkerApi } = await import('./fs-driver-rn.web.worker'));
	});

	afterAll(() => {
		if (originalNavigator) {
			Object.defineProperty(globalThis, 'navigator', originalNavigator);
		} else {
			delete (globalThis as { navigator?: Navigator }).navigator;
		}
		if (originalIndexedDb) {
			Object.defineProperty(globalThis, 'indexedDB', originalIndexedDb);
		} else {
			delete (globalThis as { indexedDB?: IDBFactory }).indexedDB;
		}
	});

	const makeWorker = (root: FileSystemDirectoryHandle) => {
		return Object.assign(Object.create(WorkerApi.prototype), {
			fsRoot_: root,
			initPromise_: Promise.resolve(),
			directoryHandleCache_: new Map(),
			virtualFiles_: new Map(),
			externalHandles_: new Map(),
		}) as WorkerApiType;
	};

	const makeRoot = (files: Map<string, FileSystemFileHandle>) => {
		const root = {
			getFileHandle: jest.fn(async (name: string) => files.get(name)),
			removeEntry: jest.fn(async (name: string) => {
				if (!files.delete(name)) throw new DOMException('File not found', 'NotFoundError');
			}),
		};
		return root;
	};

	it('moves a file with a sync access handle when createWritable is unavailable', async () => {
		const sourceBytes = new Uint8Array([1, 2, 3, 4, 5]);
		const destinationBytes = new Uint8Array(sourceBytes.length);
		const writer = {
			truncate: jest.fn(),
			write: jest.fn((data: Uint8Array, options: { at: number }) => {
				// A partial write should continue at the next position.
				const written = Math.min(data.byteLength, 2);
				destinationBytes.set(data.subarray(0, written), options.at);
				return written;
			}),
			flush: jest.fn(),
			close: jest.fn(),
		};
		const source = {
			getFile: async () => new Blob([sourceBytes]) as File,
		} as FileSystemFileHandle;
		const destination = {
			createSyncAccessHandle: jest.fn(async () => writer),
		} as unknown as FileSystemFileHandle;
		const files = new Map<string, FileSystemFileHandle>([
			['note._tmp', source],
			['note.html', destination],
		]);
		const root = makeRoot(files);
		const worker = makeWorker(root as unknown as FileSystemDirectoryHandle);

		await worker.move('/note.tmp', '/note.html');

		expect(destination.createSyncAccessHandle).toHaveBeenCalledTimes(1);
		expect(writer.truncate).toHaveBeenCalledWith(0);
		expect(writer.write).toHaveBeenCalledTimes(3);
		expect(writer.flush).toHaveBeenCalledTimes(1);
		expect(writer.close).toHaveBeenCalledTimes(1);
		expect(destinationBytes).toEqual(sourceBytes);
		expect(files.has('note._tmp')).toBe(false);
		expect(root.removeEntry).toHaveBeenCalledWith('note._tmp', { recursive: false });
	});

	it('uses the mapped filename when unlinking a temporary file', async () => {
		const files = new Map<string, FileSystemFileHandle>([
			['note._tmp', {} as FileSystemFileHandle],
		]);
		const root = makeRoot(files);
		const worker = makeWorker(root as unknown as FileSystemDirectoryHandle);

		await worker.unlink('/note.tmp');

		expect(root.removeEntry).toHaveBeenCalledWith('note._tmp', { recursive: false });
		expect(files.size).toBe(0);
	});
});
