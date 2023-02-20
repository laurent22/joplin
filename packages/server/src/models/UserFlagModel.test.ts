import { UserFlagType } from '../services/database/types';
import { beforeAllDb, afterAllTests, beforeEachDb, models, createUserAndSession } from '../utils/testing/testUtils';

describe('UserFlagModel', () => {

	beforeAll(async () => {
		await beforeAllDb('UserFlagModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should create no more than one flag per type', async () => {
		const { user } = await createUserAndSession(1);

		const beforeTime = Date.now();
		await models().userFlag().add(user.id, UserFlagType.AccountOverLimit);
		const flag = await models().userFlag().byUserId(user.id, UserFlagType.AccountOverLimit);

		expect(flag.user_id).toBe(user.id);
		expect(flag.type).toBe(UserFlagType.AccountOverLimit);
		expect(flag.created_time).toBeGreaterThanOrEqual(beforeTime);
		expect(flag.updated_time).toBeGreaterThanOrEqual(beforeTime);

		const flagCountBefore = (await models().userFlag().all()).length;
		await models().userFlag().add(user.id, UserFlagType.AccountOverLimit);
		const flagCountAfter = (await models().userFlag().all()).length;
		expect(flagCountBefore).toBe(flagCountAfter);

		await models().userFlag().add(user.id, UserFlagType.FailedPaymentFinal);
		const flagCountAfter2 = (await models().userFlag().all()).length;
		expect(flagCountAfter2).toBe(flagCountBefore + 1);
		const differentFlag = await models().userFlag().byUserId(user.id, UserFlagType.FailedPaymentFinal);
		expect(flag.id).not.toBe(differentFlag.id);
	});

	test('should set the timestamp when disabling an account', async () => {
		const { user } = await createUserAndSession(1);

		const beforeTime = Date.now();
		await models().userFlag().add(user.id, UserFlagType.FailedPaymentFinal);

		expect((await models().user().load(user.id)).disabled_time).toBeGreaterThanOrEqual(beforeTime);

		await models().userFlag().remove(user.id, UserFlagType.FailedPaymentFinal);

		expect((await models().user().load(user.id)).disabled_time).toBe(0);
	});

});
