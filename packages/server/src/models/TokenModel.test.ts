import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models } from '../utils/testing/testUtils';

describe('TokenModel', () => {

	beforeAll(async () => {
		await beforeAllDb('TokenModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should delete old tokens', async () => {
		const { user: user1 } = await createUserAndSession(1);
		await models().token().generate(user1.id);

		const [token1, token2] = await models().token().all();
		await models().token().save({ id: token1.id, created_time: Date.now() - 2629746000 });
		await models().token().deleteExpiredTokens();

		const tokens = await models().token().all();
		expect(tokens.length).toBe(1);
		expect(tokens[0].id).toBe(token2.id);
	});

});
