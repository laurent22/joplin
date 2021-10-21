import { clientType } from '../../db';
import { Item } from '../../services/database/types';
import { afterAllTests, beforeAllDb, beforeEachDb, createUserAndSession, db, expectNotThrow, expectThrow, makeNoteSerializedBody, models } from '../../utils/testing/testUtils';
import ContentDriverDatabase from './ContentDriverDatabase';
import ContentDriverMemory from './ContentDriverMemory';
import { shouldDeleteContent, shouldNotCreateItemIfContentNotSaved, shouldNotUpdateItemIfContentNotSaved, shouldWriteToContentAndReadItBack } from './testUtils';

const newDriver = () => {
	return new ContentDriverDatabase({
		dbClientType: clientType(db()),
	});
};

describe('ContentDriverDatabase', function() {

	beforeAll(async () => {
		await beforeAllDb('ContentDriverDatabase');
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
		const dbDriver = newDriver();
		const memoryDriver = new ContentDriverMemory();

		const testModels = models({
			contentDriver: dbDriver,
		});

		const { user } = await createUserAndSession(1);

		const output = await testModels.item().saveFromRawContent(user, [{
			name: '00000000000000000000000000000001.md',
			body: Buffer.from(makeNoteSerializedBody({
				id: '00000000000000000000000000000001',
				title: 'testing',
			})),
		}]);

		const itemId = output['00000000000000000000000000000001.md'].item.id;

		let previousByteLength = 0;

		{
			const row: Item = await db()('items').select(['id', 'jop_id', 'content']).first();
			expect(row.content.byteLength).toBeGreaterThan(10);
			previousByteLength = row.content.byteLength;
		}

		const testModelWithFallback = models({
			contentDriver: memoryDriver,
			fallbackContentDriver: dbDriver,
		});

		// If the item content is not on the main content driver, it should get
		// it from the fallback one.
		const itemFromDb = await testModelWithFallback.item().loadWithContent(itemId);
		expect(itemFromDb.content.byteLength).toBe(previousByteLength);

		// When writing content, it should use the main content driver, and set
		// the content for the fallback one to "".
		await testModelWithFallback.item().saveFromRawContent(user, [{
			name: '00000000000000000000000000000001.md',
			body: Buffer.from(makeNoteSerializedBody({
				id: '00000000000000000000000000000001',
				title: 'testing1234',
			})),
		}]);

		{
			const row: Item = await db()('items').select(['id', 'content']).first();
			expect(row.content.byteLength).toBe(0);
			const memContent = await memoryDriver.read(itemId);
			expect(memContent.byteLength).toBe(previousByteLength + 4);
		}
	});

});
