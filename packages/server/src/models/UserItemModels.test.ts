import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models } from '../utils/testing/testUtils';

describe('UserItemModel', () => {

	beforeAll(async () => {
		await beforeAllDb('UserItemModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should skip undefined values instead of crashing', async () => {
		const { user } = await createUserAndSession(3, false);

		expect(async () => models().userItem().addMulti(user.id, [undefined])).not.toThrow();
	});
});

