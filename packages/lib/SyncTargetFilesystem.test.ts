import Setting from './models/Setting';
import SyncTargetFilesystem from './SyncTargetFilesystem';

// Mock FileApiDriverLocal to avoid actual filesystem operations
jest.mock('./file-api-driver-local', () => {
	return {
		__esModule: true,
		default: jest.fn().mockImplementation(() => ({
			mkdir: jest.fn(),
		})),
	};
});

// Mock file-api
jest.mock('./file-api', () => {
	return {
		FileApi: jest.fn().mockImplementation(() => ({
			setLogger: jest.fn(),
			setSyncTargetId: jest.fn(),
		})),
	};
});

describe('SyncTargetFilesystem', () => {
	let syncTarget: SyncTargetFilesystem;

	beforeEach(() => {
		syncTarget = new SyncTargetFilesystem(null);
		syncTarget.setLogger({
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock logger for testing
		} as any);
	});

	it('should return false when sync path is empty', async () => {
		Setting.setValue('sync.2.path', '');
		expect(await syncTarget.isAuthenticated()).toBe(false);
	});

	it('should return false when sync path is whitespace only', async () => {
		Setting.setValue('sync.2.path', '   ');
		expect(await syncTarget.isAuthenticated()).toBe(false);
	});

	it('should return true when sync path is set', async () => {
		Setting.setValue('sync.2.path', '/tmp/joplin-sync-test');
		expect(await syncTarget.isAuthenticated()).toBe(true);
	});

	it('should throw an error when sync path is not set', async () => {
		Setting.setValue('sync.2.path', '');
		await expect(syncTarget.initFileApi()).rejects.toThrow(
			'File system sync path is not set',
		);
	});

	it('should not throw when sync path is set', async () => {
		Setting.setValue('sync.2.path', '/tmp/joplin-sync-test');
		await expect(syncTarget.initFileApi()).resolves.toBeDefined();
	});
});
