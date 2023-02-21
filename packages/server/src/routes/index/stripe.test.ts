import { findPrice, PricePeriod } from '@joplin/lib/utils/joplinCloud';
import { UserFlagType } from '../../services/database/types';
import { AccountType } from '../../models/UserModel';
import { betaUserTrialPeriodDays, isBetaUser, stripeConfig } from '../../utils/stripe';
import { beforeAllDb, afterAllTests, beforeEachDb, models, koaAppContext, expectNotThrow } from '../../utils/testing/testUtils';
import { AppContext } from '../../utils/types';
import uuidgen from '../../utils/uuidgen';
import { postHandlers } from './stripe';

interface StripeOptions {
	userEmail?: string;
}

function mockStripe(options: StripeOptions = null) {
	options = {
		userEmail: 'toto@example.com',
		...options,
	};

	return {
		customers: {
			retrieve: async () => {
				return {
					name: 'Toto',
					email: options.userEmail,
				};
			},
		},
		subscriptions: {
			del: jest.fn(),
		},
	};
}

interface WebhookOptions {
	stripe?: any;
	eventId?: string;
	subscriptionId?: string;
	customerId?: string;
	sessionId?: string;
	userEmail?: string;
}

async function simulateWebhook(ctx: AppContext, type: string, object: any, options: WebhookOptions = {}) {
	options = {
		stripe: mockStripe({ userEmail: options.userEmail }),
		eventId: uuidgen(),
		...options,
	};

	await postHandlers.webhook(options.stripe, {}, ctx, {
		id: options.eventId,
		type,
		data: {
			object,
		},
	}, false);
}

async function createUserViaSubscription(ctx: AppContext, options: WebhookOptions = {}) {
	options = {
		subscriptionId: `sub_${uuidgen()}`,
		customerId: `cus_${uuidgen()}`,
		...options,
	};

	const stripeSessionId = 'sess_123';
	const stripePrice = findPrice(stripeConfig().prices, { accountType: 2, period: PricePeriod.Monthly });
	await models().keyValue().setValue(`stripeSessionToPriceId::${stripeSessionId}`, stripePrice.id);

	await simulateWebhook(ctx, 'customer.subscription.created', {
		id: options.subscriptionId,
		customer: options.customerId,
		items: {
			data: [
				{
					price: stripePrice,
				},
			],
		},
	}, options);
}

describe('index/stripe', () => {

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

	test('should handle the checkout.session.completed event', async () => {
		const startTime = Date.now();

		const ctx = await koaAppContext();
		await createUserViaSubscription(ctx, { userEmail: 'toto@example.com', subscriptionId: 'sub_123' });

		const user = await models().user().loadByEmail('toto@example.com');
		expect(user.account_type).toBe(AccountType.Pro);
		expect(user.email_confirmed).toBe(0);

		const sub = await models().subscription().byUserId(user.id);
		expect(sub.stripe_subscription_id).toBe('sub_123');
		expect(sub.is_deleted).toBe(0);
		expect(sub.last_payment_time).toBeGreaterThanOrEqual(startTime);
		expect(sub.last_payment_failed_time).toBe(0);
	});

	test('should not process the same event twice', async () => {
		const ctx = await koaAppContext();
		await createUserViaSubscription(ctx, { userEmail: 'toto@example.com', eventId: 'evt_1' });
		const v = await models().keyValue().value('stripeEventDone::evt_1');
		expect(v).toBe(1);
		// This event should simply be skipped
		await expectNotThrow(async () => createUserViaSubscription(ctx, { userEmail: 'toto@example.com', eventId: 'evt_1' }));
	});

	test('should check if it is a beta user', async () => {
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

	test('should find out beta user trial end date', async () => {
		const fromDateTime = 1627901594842; // Mon Aug 02 2021 10:53:14 GMT+0000
		expect(betaUserTrialPeriodDays(1624441295775, fromDateTime)).toBe(50); // Wed Jun 23 2021 09:41:35 GMT+0000
		expect(betaUserTrialPeriodDays(1614682158000, fromDateTime)).toBe(7); // Tue Mar 02 2021 10:49:18 GMT+0000
	});

	test('should setup subscription for an existing user', async () => {
		// This is for example if a user has been manually added to the system,
		// and then later they setup their subscription. Applies to beta users
		// for instance.
		const ctx = await koaAppContext();
		const user = await models().user().save({ email: 'toto@example.com', password: uuidgen() });
		expect(await models().subscription().byUserId(user.id)).toBeFalsy();
		await createUserViaSubscription(ctx, { userEmail: 'toto@example.com', subscriptionId: 'sub_123' });

		const sub = await models().subscription().byUserId(user.id);
		expect(sub).toBeTruthy();
		expect(sub.stripe_subscription_id).toBe('sub_123');
	});

	test('should cancel duplicate subscriptions', async () => {
		const stripe = mockStripe();
		const ctx = await koaAppContext();

		await createUserViaSubscription(ctx, { userEmail: 'toto@example.com', stripe });
		expect((await models().user().all()).length).toBe(1);
		const user = (await models().user().all())[0];
		const subBefore = await models().subscription().byUserId(user.id);
		expect(stripe.subscriptions.del).toHaveBeenCalledTimes(0);

		await createUserViaSubscription(ctx, { userEmail: 'toto@example.com', stripe });
		expect((await models().user().all()).length).toBe(1);
		const subAfter = await models().subscription().byUserId(user.id);
		expect(stripe.subscriptions.del).toHaveBeenCalledTimes(1);

		expect(subBefore.stripe_subscription_id).toBe(subAfter.stripe_subscription_id);
	});

	test('should disable an account if the sub is cancelled', async () => {
		const stripe = mockStripe();
		const ctx = await koaAppContext();

		await createUserViaSubscription(ctx, { userEmail: 'toto@example.com', stripe, subscriptionId: 'sub_init' });
		await simulateWebhook(ctx, 'customer.subscription.deleted', { id: 'sub_init' });

		const user = (await models().user().all())[0];
		const sub = (await models().subscription().all())[0];
		expect(user.enabled).toBe(0);
		expect(sub.is_deleted).toBe(1);
	});

	test('should re-enable account if sub was cancelled and new sub created', async () => {
		const stripe = mockStripe();
		const ctx = await koaAppContext();

		await createUserViaSubscription(ctx, { userEmail: 'toto@example.com', stripe, subscriptionId: 'sub_init' });
		const user = (await models().user().all())[0];
		const sub = await models().subscription().byUserId(user.id);
		expect(sub.stripe_subscription_id).toBe('sub_init');

		await simulateWebhook(ctx, 'customer.subscription.deleted', { id: 'sub_init' });

		await createUserViaSubscription(ctx, { userEmail: 'toto@example.com', stripe, subscriptionId: 'cus_recreate' });

		{
			const user = (await models().user().all())[0];
			const sub = await models().subscription().byUserId(user.id);
			expect(user.enabled).toBe(1);
			expect(sub.is_deleted).toBe(0);
			expect(sub.stripe_subscription_id).toBe('cus_recreate');
		}
	});

	test('should re-enable account if successful payment is made', async () => {
		const stripe = mockStripe();
		const ctx = await koaAppContext();

		await createUserViaSubscription(ctx, { userEmail: 'toto@example.com', stripe, subscriptionId: 'sub_init' });
		let user = (await models().user().all())[0];
		await models().user().save({
			id: user.id,
			enabled: 0,
			can_upload: 0,
		});

		await models().userFlag().add(user.id, UserFlagType.FailedPaymentFinal);

		await simulateWebhook(ctx, 'invoice.paid', { subscription: 'sub_init' });

		user = await models().user().load(user.id);

		expect(user.enabled).toBe(1);
		expect(user.can_upload).toBe(1);
	});

	test('should attach new sub to existing user', async () => {
		// Simulates:
		// - User subscribes
		// - Later the subscription is cancelled, either automatically by Stripe or manually
		// - Then a new subscription is attached to the user on Stripe
		// => In that case, the sub should be attached to the user on Joplin Server

		const stripe = mockStripe({ userEmail: 'toto@example.com' });

		const ctx = await koaAppContext();

		await createUserViaSubscription(ctx, {
			stripe,
			subscriptionId: 'sub_1',
			customerId: 'cus_toto',
			userEmail: 'toto@example.com',
		});
		await simulateWebhook(ctx, 'customer.subscription.deleted', { id: 'sub_1' });

		const stripePrice = findPrice(stripeConfig().prices, { accountType: 1, period: PricePeriod.Monthly });

		await simulateWebhook(ctx, 'customer.subscription.created', {
			id: 'sub_new',
			customer: 'cus_toto',
			items: { data: [{ price: { id: stripePrice.id } }] },
		}, { stripe });

		const user = (await models().user().all())[0];
		const sub = await models().subscription().byUserId(user.id);

		expect(sub.stripe_user_id).toBe('cus_toto');
		expect(sub.stripe_subscription_id).toBe('sub_new');
	});

	test('should not cancel a subscription as duplicate if it is already associated with a user', async () => {
		// When user goes through a Stripe checkout, we get the following
		// events:
		//
		// - checkout.session.completed
		// - customer.subscription.created
		//
		// However we create the subscription as soon as we get
		// "checkout.session.completed", because by then we already have all the
		// necessary information. The problem is that Stripe is then going to
		// send "customer.subscription.created", even though the sub is already
		// created. Also we have some code to cancel duplicate subscriptions
		// (when a user accidentally subscribe multiple times), and we don't
		// want that newly, valid, subscription to be cancelled as a duplicate.

		const stripe = mockStripe({ userEmail: 'toto@example.com' });

		const ctx = await koaAppContext();

		await createUserViaSubscription(ctx, {
			stripe,
			subscriptionId: 'sub_1',
			customerId: 'cus_toto',
			userEmail: 'toto@example.com',
		});

		const stripePrice = findPrice(stripeConfig().prices, { accountType: 1, period: PricePeriod.Monthly });

		await simulateWebhook(ctx, 'customer.subscription.created', {
			id: 'sub_1',
			customer: 'cus_toto',
			items: { data: [{ price: { id: stripePrice.id } }] },
		}, { stripe });

		// Verify that we didn't try to delete that new subscription
		expect(stripe.subscriptions.del).toHaveBeenCalledTimes(0);
	});

});
