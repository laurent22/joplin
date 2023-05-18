import { UserFlagType } from '../../services/database/types';
import { beforeAllDb, afterAllTests, beforeEachDb, createUser, models, db } from '../../utils/testing/testUtils';
import { disabledUserIds, setUserAccountDisabledTimes } from '../20220131185922_account_disabled_timestamp';

describe('20220131185922_account_disabled_timestamp', () => {

	beforeAll(async () => {
		await beforeAllDb('20220131185922_account_disabled_timestamp');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should set the user account disabled time', async () => {
		const user1 = await createUser(1);
		const user2 = await createUser(2);
		const user3 = await createUser(3);
		const user4 = await createUser(4);

		jest.useFakeTimers();

		// -------------------------------------------------
		// User 1
		// -------------------------------------------------

		const t0 = new Date('2021-12-14').getTime();
		jest.setSystemTime(t0);

		await models().userFlag().add(user1.id, UserFlagType.AccountOverLimit);

		// -------------------------------------------------
		// User 2
		// -------------------------------------------------

		const t1 = new Date('2021-12-15').getTime();
		jest.setSystemTime(t1);

		await models().userFlag().add(user2.id, UserFlagType.FailedPaymentFinal);

		const t2 = new Date('2021-12-16').getTime();
		jest.setSystemTime(t2);

		await models().userFlag().add(user2.id, UserFlagType.ManuallyDisabled);

		// -------------------------------------------------
		// User 3
		// -------------------------------------------------

		const t3 = new Date('2021-12-17').getTime();
		jest.setSystemTime(t3);

		await models().userFlag().add(user3.id, UserFlagType.SubscriptionCancelled);

		const userIds = await disabledUserIds(db());
		expect(userIds.sort()).toEqual([user2.id, user3.id].sort());

		await setUserAccountDisabledTimes(db(), userIds);

		expect((await models().user().load(user1.id)).disabled_time).toBe(0);
		expect((await models().user().load(user2.id)).disabled_time).toBe(t1);
		expect((await models().user().load(user3.id)).disabled_time).toBe(t3);
		expect((await models().user().load(user4.id)).disabled_time).toBe(0);

		jest.useRealTimers();
	});

});
