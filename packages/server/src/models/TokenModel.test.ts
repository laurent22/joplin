import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, expectThrow } from '../utils/testing/testUtils';
import { TokenPurpose } from './TokenModel';

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
		await models().token().generate(user1.id, TokenPurpose.Csrf);

		const [token1, token2] = await models().token().all();
		await models().token().save({ id: token1.id, created_time: Date.now() - 2629746000 });
		await models().token().deleteExpiredTokens();

		const tokens = await models().token().all();
		expect(tokens.length).toBe(1);
		expect(tokens[0].id).toBe(token2.id);
	});

	test('should not accept a token minted for another purpose', async () => {
		const { user } = await createUserAndSession(1);
		const token = await models().token().generate(user.id, TokenPurpose.AccountConfirmation);

		expect(await models().token().isValid(user.id, token, TokenPurpose.AccountConfirmation)).toBe(true);
		expect(await models().token().isValid(user.id, token, TokenPurpose.PasswordReset)).toBe(false);
		expect(await models().token().isValid(user.id, token, TokenPurpose.Csrf)).toBe(false);
		await expectThrow(async () => models().token().checkToken(user.id, token, TokenPurpose.Csrf));

		// Deleting it under the wrong purpose must leave it in place.
		await models().token().deleteByValue(user.id, token, TokenPurpose.Csrf);
		expect(await models().token().isValid(user.id, token, TokenPurpose.AccountConfirmation)).toBe(true);

		await models().token().deleteByValue(user.id, token, TokenPurpose.AccountConfirmation);
		expect(await models().token().isValid(user.id, token, TokenPurpose.AccountConfirmation)).toBe(false);
	});

});
