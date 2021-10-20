import { afterAllTests, beforeAllDb, beforeEachDb } from '../../utils/testing/testUtils';
import ContentDriverMemory from './ContentDriverMemory';
import { shouldDeleteContent, shouldNotCreateItemIfContentNotSaved, shouldNotUpdateItemIfContentNotSaved, shouldWriteToContentAndReadItBack } from './testUtils';

describe('ContentDriverMemory', function() {

	beforeAll(async () => {
		await beforeAllDb('ContentDriverMemory');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should write to content and read it back', async function() {
		const driver = new ContentDriverMemory();
		await shouldWriteToContentAndReadItBack(driver);
	});

	test('should delete the content', async function() {
		const driver = new ContentDriverMemory();
		await shouldDeleteContent(driver);
	});

	test('should not create the item if the content cannot be saved', async function() {
		const driver = new ContentDriverMemory();
		await shouldNotCreateItemIfContentNotSaved(driver);
	});

	test('should not update the item if the content cannot be saved', async function() {
		const driver = new ContentDriverMemory();
		await shouldNotUpdateItemIfContentNotSaved(driver);
	});

});

