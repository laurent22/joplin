import { StripePublicConfigPrice } from '@joplin/lib/utils/joplinCloud';
import { RecursivePartial } from '@joplin/utils/types';
import type Stripe from 'stripe';

type MockedSubscription = RecursivePartial<Stripe.Subscription>;
type RetrieveSubscription = (subId: string)=> Promise<MockedSubscription>;
type UpdateSubscription = (subId: string, options: unknown)=> Promise<void>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- using any as an upper bound
type Mocked<T extends (...args: any)=> any> = jest.Mock<ReturnType<T>, Parameters<T>>;

interface MockSubscriptionOptions {
	periodEnd?: Date;
	trialEnd?: Date|null;
	items?: StripePublicConfigPrice[];
}

interface StripeMock {
	subscriptions: {
		update: Mocked<UpdateSubscription>;
		retrieve: Mocked<RetrieveSubscription>;
	};

	resetMock(): void;
	setMockSubscription(id: string, options: MockSubscriptionOptions): MockedSubscription;
}

jest.mock('stripe', () => {
	const { Day, Second } = require('@joplin/utils/time');

	const subscriptions = new Map<string, MockedSubscription>();
	const mock: StripeMock = {
		subscriptions: {
			update: jest.fn(),
			retrieve: jest.fn((id) => {
				return Promise.resolve(subscriptions.get(id));
			}),
		},

		resetMock: () => {
			mock.subscriptions.update.mockClear();
			mock.subscriptions.retrieve.mockClear();
			subscriptions.clear();
		},

		setMockSubscription: (id, {
			items = [],
			periodEnd = new Date(Date.now() + Day),
			trialEnd,
		}) => {
			const subscription = {
				id,
				trial_end: trialEnd ? trialEnd.getTime() / Second : null,
				current_period_end: periodEnd.getTime() / Second,
				items: {
					data: items.map(item => ({
						price: { id: item.id },
					})),
				},
			};
			subscriptions.set(id, subscription);

			return subscription;
		},
	};
	return () => mock;
});

const mockedStripe = require('stripe')();
// Export mockedStripe as both Stripe and StripeMock to limit the number of casts
// needed in testing logic
export const stripe: Stripe = mockedStripe;
export const mock: StripeMock = mockedStripe;

export const reset = () => {
	mock.resetMock();
};
