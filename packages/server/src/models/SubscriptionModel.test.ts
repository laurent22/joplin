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
	});

	test('should create a user and subscription', async () => {
		await models().subscription().saveUserAndSubscription(
			'toto@example.com',
			'Toto',
			AccountType.Pro,
			'STRIPE_USER_ID',
			'STRIPE_SUB_ID'
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
			'STRIPE_SUB_ID'
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

});
