import globalConfig from '../config';
import { StripeConfig } from './types';
import { Stripe } from 'stripe';
import { Subscription, Uuid } from '../db';
import { Models } from '../models/factory';
import { AccountType } from '../models/UserModel';
import { findPrice, PricePeriod } from '@joplin/lib/utils/joplinCloud';
const stripeLib = require('stripe');

export interface SubscriptionInfo {
	sub: Subscription;
	stripeSub: Stripe.Subscription;
}

export function stripeConfig(): StripeConfig {
	return globalConfig().stripe;
}

export function initStripe(): Stripe {
	return stripeLib(stripeConfig().secretKey);
}

export function priceIdToAccountType(priceId: string): AccountType {
	const price = findPrice(stripeConfig().prices, { priceId });
	return price.accountType;
}

export function accountTypeToPriceId(accountType: AccountType): string {
	const price = findPrice(stripeConfig().prices, { accountType, period: PricePeriod.Monthly });
	return price.id;
}

export async function subscriptionInfoByUserId(models: Models, userId: Uuid): Promise<SubscriptionInfo> {
	const sub = await models.subscription().byUserId(userId);
	if (!sub) throw new Error('Could not retrieve subscription info');

	const stripe = initStripe();
	const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
	if (!stripeSub) throw new Error('Could not retrieve Stripe subscription');

	return { sub, stripeSub };
}

export async function stripePriceIdByUserId(models: Models, userId: Uuid): Promise<string> {
	const { stripeSub } = await subscriptionInfoByUserId(models, userId);
	return stripePriceIdByStripeSub(stripeSub);
}

export function stripePriceIdByStripeSub(stripeSub: Stripe.Subscription): string {
	return stripeSub.items.data[0].price.id;
}

export async function cancelSubscription(models: Models, userId: Uuid) {
	const sub = await models.subscription().byUserId(userId);
	if (!sub) throw new Error(`No subscription for user: ${userId}`);
	const stripe = initStripe();
	await stripe.subscriptions.del(sub.stripe_subscription_id);
}

export async function updateSubscriptionType(models: Models, userId: Uuid, newAccountType: AccountType) {
	const user = await models.user().load(userId);
	if (user.account_type === newAccountType) throw new Error(`Account type is already: ${newAccountType}`);

	const { sub, stripeSub } = await subscriptionInfoByUserId(models, userId);

	const currentPrice = findPrice(stripeConfig().prices, { priceId: stripePriceIdByStripeSub(stripeSub) });
	const upgradePrice = findPrice(stripeConfig().prices, { accountType: newAccountType, period: currentPrice.period });

	const items: Stripe.SubscriptionUpdateParams.Item[] = [];

	// First delete all the items that don't match the new account type. That
	// means for example deleting the "Joplin Cloud Pro" item if the new account
	// type is "Basic" and vice versa.
	for (const stripeSubItem of stripeSub.items.data) {
		if (stripeSubItem.price.id === upgradePrice.id) throw new Error(`This account is already of type ${newAccountType}`);

		if (stripeSubItem.price.id !== upgradePrice.id) {
			items.push({
				id: stripeSubItem.id,
				deleted: true,
			});
		}
	}

	// Then add the item that we need, either Pro or Basic plan. It seems it's
	// sufficient to specify the price ID, and from that Stripe infers the
	// product.
	items.push({
		price: upgradePrice.id,
	});

	// Note that we only update the Stripe subscription here (or attempt to do
	// so). The local subscription object will only be updated when we get the
	// `customer.subscription.updated` event back from Stripe.
	//
	// It shouldn't have a big impact since it's only for a short time, but it
	// means in the meantime the account type will not be changed and, for
	// example, the user could try to upgrade the account a second time.
	// Although that attempt would most likely fail due the checks above and
	// the checks in subscriptions.update().
	const stripe = initStripe();
	await stripe.subscriptions.update(sub.stripe_subscription_id, { items });
}
