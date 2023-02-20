import { mkdirp, pathExists, remove } from 'fs-extra';
import { afterAllTests, beforeAllDb, beforeEachDb, expectNotThrow, tempDirPath } from '../../../utils/testing/testUtils';
import { StorageDriverConfig, StorageDriverMode, StorageDriverType } from '../../../utils/types';
import StorageDriverFs from './StorageDriverFs';
import { shouldDeleteContent, shouldNotCreateItemIfContentNotSaved, shouldNotUpdateItemIfContentNotSaved, shouldSupportFallbackDriver, shouldSupportFallbackDriverInReadWriteMode, shouldThrowNotFoundIfNotExist, shouldUpdateContentStorageIdAfterSwitchingDriver, shouldWriteToContentAndReadItBack } from './testUtils';

const basePath_: string = tempDirPath();

const newDriver = (path: string = null) => {
	return new StorageDriverFs(1, { path: path === null ? basePath_ : path });
};

const newConfig = (path: string = null): StorageDriverConfig => {
	return {
		type: StorageDriverType.Filesystem,
		path: path === null ? basePath_ : path,
	};
};

describe('StorageDriverFs', () => {

	beforeAll(async () => {
		await beforeAllDb('StorageDriverFs');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	afterEach(async () => {
		await remove(basePath_);
		await mkdirp(basePath_);
	});

	shouldWriteToContentAndReadItBack(newConfig());
	shouldDeleteContent(newConfig());
	shouldNotCreateItemIfContentNotSaved(newConfig());
	shouldNotUpdateItemIfContentNotSaved(newConfig());
	shouldSupportFallbackDriver(newConfig(), { type: StorageDriverType.Memory });
	shouldSupportFallbackDriverInReadWriteMode(newConfig(), { type: StorageDriverType.Memory, mode: StorageDriverMode.ReadAndWrite });
	shouldUpdateContentStorageIdAfterSwitchingDriver(newConfig(), { type: StorageDriverType.Memory });
	shouldThrowNotFoundIfNotExist(newConfig());

	test('should write to a file and read it back', async () => {
		const driver = newDriver();
		await driver.write('testing', Buffer.from('testing'));
		const content = await driver.read('testing');
		expect(content.toString()).toBe('testing');
	});

	test('should automatically create the base path', async () => {
		const tmp = `${tempDirPath()}/testcreate`;
		expect(await pathExists(tmp)).toBe(false);
		const driver = newDriver(tmp);
		await driver.write('testing', Buffer.from('testing'));
		expect(await pathExists(tmp)).toBe(true);
	});

	test('should not throw if deleting a file that does not exist', async () => {
		const driver = newDriver();
		await expectNotThrow(async () => driver.delete('notthere'));
	});

});
