import { afterAllTests, beforeAllDb, beforeEachDb } from '../../../utils/testing/testUtils';
import { StorageDriverConfig, StorageDriverType } from '../../../utils/types';
import { shouldDeleteContent, shouldNotCreateItemIfContentNotSaved, shouldNotUpdateItemIfContentNotSaved, shouldWriteToContentAndReadItBack } from './testUtils';

const newConfig = (): StorageDriverConfig => {
	return {
		type: StorageDriverType.Memory,
	};
};

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

});

