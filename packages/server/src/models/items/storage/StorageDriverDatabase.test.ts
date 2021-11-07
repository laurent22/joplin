import { clientType } from '../../../db';
import { afterAllTests, beforeAllDb, beforeEachDb, db, expectNotThrow, expectThrow, models } from '../../../utils/testing/testUtils';
import { StorageDriverMode } from '../../../utils/types';
import StorageDriverDatabase from './StorageDriverDatabase';
import StorageDriverMemory from './StorageDriverMemory';
import { shouldDeleteContent, shouldNotCreateItemIfContentNotSaved, shouldNotUpdateItemIfContentNotSaved, shouldSupportFallbackDriver, shouldSupportFallbackDriverInReadWriteMode, shouldUpdateContentStorageIdAfterSwitchingDriver, shouldWriteToContentAndReadItBack } from './testUtils';

const newDriver = () => {
	return new StorageDriverDatabase(1, {
		dbClientType: clientType(db()),
	});
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
		const driver = newDriver();
		await shouldWriteToContentAndReadItBack(driver);
	});

	test('should delete the content', async function() {
		const driver = newDriver();
		await shouldDeleteContent(driver);
	});

	test('should not create the item if the content cannot be saved', async function() {
		const driver = newDriver();
		await shouldNotCreateItemIfContentNotSaved(driver);
	});

	test('should not update the item if the content cannot be saved', async function() {
		const driver = newDriver();
		await shouldNotUpdateItemIfContentNotSaved(driver);
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
		await shouldSupportFallbackDriver(newDriver(), new StorageDriverMemory(2));
	});

	test('should support fallback content drivers in rw mode', async function() {
		await shouldSupportFallbackDriverInReadWriteMode(newDriver(), new StorageDriverMemory(2, { mode: StorageDriverMode.ReadWrite }));
	});

	test('should update content storage ID after switching driver', async function() {
		await shouldUpdateContentStorageIdAfterSwitchingDriver(newDriver(), new StorageDriverMemory(2));
	});

});
