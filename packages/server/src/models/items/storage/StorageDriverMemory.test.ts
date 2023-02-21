import { mkdirp, remove } from 'fs-extra';
import { afterAllTests, beforeAllDb, beforeEachDb, tempDirPath } from '../../../utils/testing/testUtils';
import { StorageDriverConfig, StorageDriverMode, StorageDriverType } from '../../../utils/types';
import { shouldDeleteContent, shouldNotCreateItemIfContentNotSaved, shouldNotUpdateItemIfContentNotSaved, shouldSupportFallbackDriver, shouldSupportFallbackDriverInReadWriteMode, shouldThrowNotFoundIfNotExist, shouldUpdateContentStorageIdAfterSwitchingDriver, shouldWriteToContentAndReadItBack } from './testUtils';

const fsDriverPath_ = tempDirPath();

const newConfig = (): StorageDriverConfig => {
	return {
		type: StorageDriverType.Memory,
	};
};

describe('StorageDriverMemory', () => {

	beforeAll(async () => {
		await beforeAllDb('StorageDriverMemory');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
		await mkdirp(fsDriverPath_);
	});

	afterEach(async () => {
		await remove(fsDriverPath_);
	});

	shouldWriteToContentAndReadItBack(newConfig());
	shouldDeleteContent(newConfig());
	shouldNotCreateItemIfContentNotSaved(newConfig());
	shouldNotUpdateItemIfContentNotSaved(newConfig());
	shouldSupportFallbackDriver(newConfig(), { type: StorageDriverType.Filesystem, path: fsDriverPath_ });
	shouldSupportFallbackDriverInReadWriteMode(newConfig(), { type: StorageDriverType.Filesystem, path: fsDriverPath_, mode: StorageDriverMode.ReadAndWrite });
	shouldUpdateContentStorageIdAfterSwitchingDriver(newConfig(), { type: StorageDriverType.Filesystem, path: fsDriverPath_ });
	shouldThrowNotFoundIfNotExist(newConfig());

});
