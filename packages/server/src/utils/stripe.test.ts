import { AccountType } from '../models/UserModel';
import { stripe, mock as stripeMock, reset as resetStripe } from '../utils/testing/mockStripe';
import { recheckPaymentStatus } from './stripe';
import { afterAllTests, beforeAllDb, models } from './testing/testUtils';

describe('utils/stripe', () => {
	beforeAll(async () => {
		await beforeAllDb('utils/stripe');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(() => {
		resetStripe();
	});

	test('recheckPaymentStatus should recheck the billing period', async () => {
		const periodEnd1 = new Date('2026-07-13');
		const periodEnd2 = new Date('2026-07-15');
		stripeMock.setMockSubscription('sub_001', { periodEnd: periodEnd1 });

		const { user } = await models().subscription().saveUserAndSubscription('test@example.com', 'Testing', AccountType.Basic, 'cus_001', 'sub_001');

		await recheckPaymentStatus(stripe, models(), user.id);
		expect(await models().subscription().byUserId(user.id)).toMatchObject({
			current_period_end: periodEnd1.getTime(),
		});

		stripeMock.setMockSubscription('sub_001', { periodEnd: periodEnd2 });

		await recheckPaymentStatus(stripe, models(), user.id);
		expect(await models().subscription().byUserId(user.id)).toMatchObject({
			current_period_end: periodEnd2.getTime(),
		});
	});
});
