import { clientType } from '../../db';
import { Item } from '../../services/database/types';
import { afterAllTests, beforeAllDb, beforeEachDb, createUserAndSession, db, expectNotThrow, expectThrow, makeNoteSerializedBody, models } from '../../utils/testing/testUtils';
import ContentDriverDatabase from './ContentDriverDatabase';

const newDriver = () => {
	return new ContentDriverDatabase({
		dbClientType: clientType(db()),
	});
};

const testModels = (driver: ContentDriverDatabase = null) => {
	return models({ contentDriver: driver ? driver : newDriver() });
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
		const driver = new ContentDriverDatabase({
			dbClientType: clientType(db()),
		});

		const { user } = await createUserAndSession(1);
		const noteBody = makeNoteSerializedBody({
			id: '00000000000000000000000000000001',
			title: 'testing driver',
		});

		const output = await testModels(driver).item().saveFromRawContent(user, [{
			name: '00000000000000000000000000000001.md',
			body: Buffer.from(noteBody),
		}]);

		const result = output['00000000000000000000000000000001.md'];
		expect(result.error).toBeFalsy();

		// Check that we hace some data in the "content" property to ensure the
		// driver is indeed writing there.
		const itemFromDb = await testModels().item().load(result.item.id, { fields: ['content', 'content_size'] });
		expect(itemFromDb.content.byteLength).toBe(itemFromDb.content_size);

		const item = testModels(driver).item().itemToJoplinItem(await testModels().item().loadByJopId(user.id, '00000000000000000000000000000001', { withContent: true }));
		expect(item.id).toBe('00000000000000000000000000000001');
		expect(item.title).toBe('testing driver');
	});

	test('should delete the content', async function() {
		const { user } = await createUserAndSession(1);
		const noteBody = makeNoteSerializedBody({
			id: '00000000000000000000000000000001',
			title: 'testing driver',
		});

		const output = await testModels().item().saveFromRawContent(user, [{
			name: '00000000000000000000000000000001.md',
			body: Buffer.from(noteBody),
		}]);

		const item: Item = output['00000000000000000000000000000001.md'].item;

		expect((await testModels().item().all()).length).toBe(1);
		await testModels().item().delete(item.id);
		expect((await testModels().item().all()).length).toBe(0);
	});

	test('should fail if the item row does not exist', async function() {
		const driver = newDriver();
		await expectThrow(async () => driver.read('oops', { models: models() }));
	});

	test('should do nothing if deleting non-existing row', async function() {
		const driver = newDriver();
		await expectNotThrow(async () => driver.delete('oops', { models: models() }));
	});

});
