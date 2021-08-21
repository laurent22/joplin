import { UserFlagType } from '../db';
import { beforeAllDb, afterAllTests, beforeEachDb, models, createUserAndSession } from '../utils/testing/testUtils';

describe('UserFlagModel', function() {

	beforeAll(async () => {
		await beforeAllDb('UserFlagModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should create no more than one flag per type', async function() {
		const { user } = await createUserAndSession(1);

		const beforeTime = Date.now();
		let flag = await models().userFlag().add(user.id, UserFlagType.AccountOverLimit);

		expect(flag.user_id).toBe(user.id);
		expect(flag.type).toBe(UserFlagType.AccountOverLimit);
		expect(flag.created_time).toBeGreaterThanOrEqual(beforeTime);
		expect(flag.updated_time).toBeGreaterThanOrEqual(beforeTime);

		flag = await models().userFlag().byUserId(user.id, UserFlagType.AccountOverLimit);

		const sameFlag = await models().userFlag().add(user.id, UserFlagType.AccountOverLimit);
		expect(flag.id).toBe(sameFlag.id);

		let differentFlag = await models().userFlag().add(user.id, UserFlagType.FailedPaymentFinal);
		differentFlag = await models().userFlag().byUserId(user.id, UserFlagType.FailedPaymentFinal);
		expect(flag.id).not.toBe(differentFlag.id);
	});

});
