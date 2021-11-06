import { afterAllTests, beforeAllDb, beforeEachDb } from '../../../utils/testing/testUtils';
import StorageDriverMemory from './StorageDriverMemory';
import { shouldDeleteContent, shouldNotCreateItemIfContentNotSaved, shouldNotUpdateItemIfContentNotSaved, shouldWriteToContentAndReadItBack } from './testUtils';

describe('StorageDriverMemory', function() {

	beforeAll(async () => {
		await beforeAllDb('StorageDriverMemory');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should write to content and read it back', async function() {
		const driver = new StorageDriverMemory(1);
		await shouldWriteToContentAndReadItBack(driver);
	});

	test('should delete the content', async function() {
		const driver = new StorageDriverMemory(1);
		await shouldDeleteContent(driver);
	});

	test('should not create the item if the content cannot be saved', async function() {
		const driver = new StorageDriverMemory(1);
		await shouldNotCreateItemIfContentNotSaved(driver);
	});

	test('should not update the item if the content cannot be saved', async function() {
		const driver = new StorageDriverMemory(1);
		await shouldNotUpdateItemIfContentNotSaved(driver);
	});

});

