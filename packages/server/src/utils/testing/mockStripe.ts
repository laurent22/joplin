import { StripePublicConfigPrice } from '@joplin/lib/utils/joplinCloud';
import { RecursivePartial } from '@joplin/utils/types';
import type Stripe from 'stripe';

type MockedSubscription = RecursivePartial<Stripe.Subscription>;
type RetrieveSubscription = (subId: string)=> Promise<MockedSubscription>;
type UpdateSubscription = (subId: string, options: unknown)=> Promise<void>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- using any as an upper bound
type Mocked<T extends (...args: any)=> any> = jest.Mock<ReturnType<T>, Parameters<T>>;

interface StripeMock {
	subscriptions: {
		update: Mocked<UpdateSubscription>;
		retrieve: Mocked<RetrieveSubscription>;
	};

	resetMock(): void;
	addMockSubscription(id: string, items: StripePublicConfigPrice[]): void;
}

jest.mock('stripe', () => {
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

		addMockSubscription: (id, items) => {
			subscriptions.set(id, {
				id,
				items: {
					data: items.map(item => ({
						price: { id: item.id },
					})),
				},
			});
		},
	};
	return () => mock;
});

export const mock: StripeMock = require('stripe')();

export const reset = () => {
	mock.resetMock();
};
