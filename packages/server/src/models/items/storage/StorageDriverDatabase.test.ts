import { clientType } from '../../../db';
import { afterAllTests, beforeAllDb, beforeEachDb, db, expectNotThrow, expectThrow, models } from '../../../utils/testing/testUtils';
import { StorageDriverConfig, StorageDriverMode, StorageDriverType } from '../../../utils/types';
import StorageDriverDatabase from './StorageDriverDatabase';
import { shouldDeleteContent, shouldNotCreateItemIfContentNotSaved, shouldNotUpdateItemIfContentNotSaved, shouldSupportFallbackDriver, shouldSupportFallbackDriverInReadWriteMode, shouldThrowNotFoundIfNotExist, shouldUpdateContentStorageIdAfterSwitchingDriver, shouldWriteToContentAndReadItBack } from './testUtils';

const newDriver = () => {
	return new StorageDriverDatabase(1, {
		dbClientType: clientType(db()),
	});
};

const newConfig = (): StorageDriverConfig => {
	return {
		type: StorageDriverType.Database,
	};
};

describe('StorageDriverDatabase', () => {

	beforeAll(async () => {
		await beforeAllDb('StorageDriverDatabase');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	shouldWriteToContentAndReadItBack(newConfig());
	shouldDeleteContent(newConfig());
	shouldNotCreateItemIfContentNotSaved(newConfig());
	shouldNotUpdateItemIfContentNotSaved(newConfig());
	shouldSupportFallbackDriver(newConfig(), { type: StorageDriverType.Memory });
	shouldSupportFallbackDriverInReadWriteMode(newConfig(), { type: StorageDriverType.Memory, mode: StorageDriverMode.ReadAndWrite });
	shouldUpdateContentStorageIdAfterSwitchingDriver(newConfig(), { type: StorageDriverType.Memory });
	shouldThrowNotFoundIfNotExist(newConfig());

	test('should fail if the item row does not exist', async () => {
		const driver = newDriver();
		await expectThrow(async () => driver.read('oops', { models: models() }));
	});

	test('should do nothing if deleting non-existing row', async () => {
		const driver = newDriver();
		await expectNotThrow(async () => driver.delete('oops', { models: models() }));
	});

});
