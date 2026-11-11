import { AccountType } from '../models/UserModel';
import { stripe, mock as stripeMock, reset as resetStripe } from '../utils/testing/mockStripe';
import { recheckPaymentStatus, stripeConfig, subscriptionItemByStripeSub } from './stripe';
import { afterAllTests, beforeAllDb, beforeEachDb, models } from './testing/testUtils';
import { findPrice, PricePeriod } from '@joplin/lib/utils/joplinCloud';
import type Stripe from 'stripe';

const makeStripeSub = (priceIds: string[]) => {
	return {
		id: 'sub_001',
		items: {
			data: priceIds.map((priceId, index) => ({
				id: `item_${index}`,
				price: { id: priceId },
			})),
		},
	} as unknown as Stripe.Subscription;
};

describe('utils/stripe', () => {
	beforeAll(async () => {
		await beforeAllDb('utils/stripe');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
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

	test.each([
		['first', false],
		['last', true],
	])('subscriptionItemByStripeSub should find the plan when it is %s in the item list', async (_label, planIsLast) => {
		const planPriceId = findPrice(stripeConfig(), { accountType: AccountType.Pro, period: PricePeriod.Monthly }).id;
		const priceIds = planIsLast ? ['price_unknown_addon', planPriceId] : [planPriceId, 'price_unknown_addon'];

		const item = subscriptionItemByStripeSub(makeStripeSub(priceIds));

		expect(item.price.id).toBe(planPriceId);
	});

	test('subscriptionItemByStripeSub should throw if no plan item is present', async () => {
		expect(() => subscriptionItemByStripeSub(makeStripeSub(['price_unknown_addon']))).toThrow();
	});
});
