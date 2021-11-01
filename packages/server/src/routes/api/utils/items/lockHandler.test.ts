import config from '../../../../config';
import { PaginatedItems } from '../../../../models/ItemModel';
import { Item } from '../../../../services/database/types';
import { getApi, putApi } from '../../../../utils/testing/apiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models } from '../../../../utils/testing/testUtils';

describe('items/lockHandlers', function() {

	beforeAll(async () => {
		await beforeAllDb('items/lockHandlers');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
		config().buildInLocksEnabled = true;
	});

	test('should save locks to the key-value store', async function() {
		const { session, user } = await createUserAndSession(1);

		const lockName = 'locks/exclusive_cli_12cb74fa9de644958b2ccbc772cb4e29.json';

		const now = Date.now();
		const result: Item = await putApi(session.id, `items/root:/${lockName}:/content`, { testing: true });
		expect(result.name).toBe(lockName);
		expect(result.updated_time).toBeGreaterThanOrEqual(now);
		expect(result.id).toBe(null);

		const values = await models().keyValue().all();
		expect(values.length).toBe(1);
		expect(values[0].key).toBe(`locks::${user.id}`);

		const value = JSON.parse(values[0].value);
		expect(value[lockName].name).toBe(lockName);
		expect(value[lockName].updated_time).toBeGreaterThanOrEqual(now);

		const getResult: PaginatedItems = await getApi(session.id, 'items/root:/locks/*:children');
		console.info(getResult);
		expect(getResult.items[0].name).toBe(result.name);
		expect(getResult.items[0].updated_time).toBe(result.updated_time);
	});

});
