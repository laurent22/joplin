import { mock as stripeMock, stripe, reset as resetStripe } from '../utils/testing/mockStripe';
import { beforeAllDb, afterAllTests, beforeEachDb, models } from '../utils/testing/testUtils';
import { AccountType } from './UserModel';
import { MB } from '../utils/bytes';
import { getCanShareFolder, getMaxItemSize } from './utils/user';

describe('SubscriptionModel', () => {

	beforeAll(async () => {
		await beforeAllDb('SubscriptionModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
		resetStripe();
	});

	test('should create a user and subscription', async () => {
		await models().subscription().saveUserAndSubscription(
			'toto@example.com',
			'Toto',
			AccountType.Pro,
			'STRIPE_USER_ID',
			'STRIPE_SUB_ID',
		);

		const user = await models().user().loadByEmail('toto@example.com');
		const sub = await models().subscription().byStripeSubscriptionId('STRIPE_SUB_ID');

		expect(user.account_type).toBe(AccountType.Pro);
		expect(user.email).toBe('toto@example.com');
		expect(user.full_name).toBe('Toto');
		expect(getCanShareFolder(user)).toBe(1);
		expect(getMaxItemSize(user)).toBe(200 * MB);

		expect(sub.stripe_subscription_id).toBe('STRIPE_SUB_ID');
		expect(sub.stripe_user_id).toBe('STRIPE_USER_ID');
		expect(sub.user_id).toBe(user.id);
	});

	test('should enable and allow the user to upload if a payment is successful', async () => {
		let { user } = await models().subscription().saveUserAndSubscription(
			'toto@example.com',
			'Toto',
			AccountType.Pro,
			'STRIPE_USER_ID',
			'STRIPE_SUB_ID',
		);

		await models().user().save({
			id: user.id,
			enabled: 0,
			can_upload: 0,
		});

		await models().subscription().handlePayment('STRIPE_SUB_ID', true);

		user = await models().user().load(user.id);
		expect(user.can_upload).toBe(1);
		expect(user.enabled).toBe(1);
	});

	test('should fetch the trial_end/current_period_end from Stripe if not stored in the database', async () => {
		const periodEnd = new Date('2026-05-06');
		const trialEnd = new Date('2026-05-05');
		stripeMock.setMockSubscription('sub_001', { periodEnd, trialEnd });

		const { subscription, user } = await models().subscription().saveUserAndSubscription('user@example.com', 'Test', AccountType.Basic, 'cus_001', 'sub_001');
		const fetched = await models().subscription().retrievePeriodEnd(stripe, subscription);
		expect(fetched.currentPeriodEnd).toBe(periodEnd.getTime());
		expect(fetched.trialEnd).toBe(trialEnd.getTime());

		// Period end and trial end should be saved in the database for future accesses:
		expect(await models().subscription().byUserId(user.id)).toMatchObject({
			current_period_end: periodEnd.getTime(),
			trial_end: trialEnd.getTime(),
		});
	});
});
