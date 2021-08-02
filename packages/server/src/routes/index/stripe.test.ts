import { findPrice, PricePeriod } from '@joplin/lib/utils/joplinCloud';
import { AccountType } from '../../models/UserModel';
import { betaUserTrialPeriodDays, initStripe, isBetaUser, stripeConfig } from '../../utils/stripe';
import { beforeAllDb, afterAllTests, beforeEachDb, models, koaAppContext, expectNotThrow } from '../../utils/testing/testUtils';
import uuidgen from '../../utils/uuidgen';
import { postHandlers } from './stripe';

async function createUserViaSubscription(userEmail: string, eventId: string = '') {
	eventId = eventId || uuidgen();
	const stripeSessionId = 'sess_123';
	const stripePrice = findPrice(stripeConfig().prices, { accountType: 2, period: PricePeriod.Monthly });
	await models().keyValue().setValue(`stripeSessionToPriceId::${stripeSessionId}`, stripePrice.id);

	const ctx = await koaAppContext();
	const stripe = initStripe();
	await postHandlers.webhook(stripe, {}, ctx, {
		id: eventId,
		type: 'checkout.session.completed',
		data: {
			object: {
				id: stripeSessionId,
				customer: 'cus_123',
				subscription: 'sub_123',
				customer_details: {
					email: userEmail,
				},
			},
		},
	}, false);
}

describe('index/stripe', function() {

	beforeAll(async () => {
		await beforeAllDb('index/stripe');
		stripeConfig().enabled = true;
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should handle the checkout.session.completed event', async function() {
		const startTime = Date.now();

		await createUserViaSubscription('toto@example.com');

		const user = await models().user().loadByEmail('toto@example.com');
		expect(user.account_type).toBe(AccountType.Pro);

		const sub = await models().subscription().byUserId(user.id);
		expect(sub.stripe_subscription_id).toBe('sub_123');
		expect(sub.is_deleted).toBe(0);
		expect(sub.last_payment_time).toBeGreaterThanOrEqual(startTime);
		expect(sub.last_payment_failed_time).toBe(0);
	});

	test('should not process the same event twice', async function() {
		await createUserViaSubscription('toto@example.com', 'evt_1');
		const v = await models().keyValue().value('stripeEventDone::evt_1');
		expect(v).toBe(1);
		// This event should simply be skipped
		await expectNotThrow(async () => createUserViaSubscription('toto@example.com', 'evt_1'));
	});

	test('should check if it is a beta user', async function() {
		const user1 = await models().user().save({ email: 'toto@example.com', password: uuidgen() });
		const user2 = await models().user().save({ email: 'tutu@example.com', password: uuidgen() });
		await models().user().save({ id: user2.id, created_time: 1624441295775 });

		expect(await isBetaUser(models(), user1.id)).toBe(false);
		expect(await isBetaUser(models(), user2.id)).toBe(true);

		await models().subscription().save({
			user_id: user2.id,
			stripe_user_id: 'usr_111',
			stripe_subscription_id: 'sub_111',
			last_payment_time: Date.now(),
		});

		expect(await isBetaUser(models(), user2.id)).toBe(false);
	});

	test('should find out beta user trial end date', async function() {
		const fromDateTime = 1627901594842; // Mon Aug 02 2021 10:53:14 GMT+0000
		expect(betaUserTrialPeriodDays(1624441295775, fromDateTime)).toBe(50); // Wed Jun 23 2021 09:41:35 GMT+0000
		expect(betaUserTrialPeriodDays(1614682158000, fromDateTime)).toBe(7); // Tue Mar 02 2021 10:49:18 GMT+0000
	});

});
