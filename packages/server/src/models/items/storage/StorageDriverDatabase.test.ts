import { clientType } from '../../../db';
import { afterAllTests, beforeAllDb, beforeEachDb, db, expectNotThrow, expectThrow, models } from '../../../utils/testing/testUtils';
import { StorageDriverConfig, StorageDriverMode, StorageDriverType } from '../../../utils/types';
import StorageDriverDatabase from './StorageDriverDatabase';
import { shouldDeleteContent, shouldNotCreateItemIfContentNotSaved, shouldNotUpdateItemIfContentNotSaved, shouldSupportFallbackDriver, shouldSupportFallbackDriverInReadWriteMode, shouldUpdateContentStorageIdAfterSwitchingDriver, shouldWriteToContentAndReadItBack } from './testUtils';

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

describe('StorageDriverDatabase', function() {

	beforeAll(async () => {
		await beforeAllDb('StorageDriverDatabase');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should write to content and read it back', async function() {
		await shouldWriteToContentAndReadItBack(newConfig());
	});

	test('should delete the content', async function() {
		await shouldDeleteContent(newConfig());
	});

	test('should not create the item if the content cannot be saved', async function() {
		await shouldNotCreateItemIfContentNotSaved(newConfig());
	});

	test('should not update the item if the content cannot be saved', async function() {
		await shouldNotUpdateItemIfContentNotSaved(newConfig());
	});

	test('should fail if the item row does not exist', async function() {
		const driver = newDriver();
		await expectThrow(async () => driver.read('oops', { models: models() }));
	});

	test('should do nothing if deleting non-existing row', async function() {
		const driver = newDriver();
		await expectNotThrow(async () => driver.delete('oops', { models: models() }));
	});

	test('should support fallback content drivers', async function() {
		await shouldSupportFallbackDriver(newConfig(), { type: StorageDriverType.Memory });
	});

	test('should support fallback content drivers in rw mode', async function() {
		await shouldSupportFallbackDriverInReadWriteMode(newConfig(), { type: StorageDriverType.Memory, mode: StorageDriverMode.ReadAndWrite });
	});

	test('should update content storage ID after switching driver', async function() {
		await shouldUpdateContentStorageIdAfterSwitchingDriver(newConfig(), { type: StorageDriverType.Memory });
	});

});
