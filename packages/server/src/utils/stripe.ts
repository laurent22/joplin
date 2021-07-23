import globalConfig from '../config';
import { StripeConfig } from './types';
import { Stripe } from 'stripe';
import { Uuid } from '../db';
import { Models } from '../models/factory';
import { AccountType, accountTypeOptions } from '../models/UserModel';
const stripeLib = require('stripe');

export function stripeConfig(): StripeConfig {
	return globalConfig().stripe;
}

export function initStripe(): Stripe {
	return stripeLib(stripeConfig().secretKey);
}

export function priceIdToAccountType(priceId: string): AccountType {
	if (stripeConfig().basicPriceId === priceId) return AccountType.Basic;
	if (stripeConfig().proPriceId === priceId) return AccountType.Pro;
	throw new Error(`Unknown price ID: ${priceId}`);
}

export function accountTypeToPriceId(accountType: AccountType): string {
	if (accountType === AccountType.Basic) return stripeConfig().basicPriceId;
	if (accountType === AccountType.Pro) return stripeConfig().proPriceId;
	throw new Error(`Unknown account type: ${accountType}`);
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

	const sub = await models.subscription().byUserId(userId);
	if (!sub) throw new Error(`No subscription for user: ${userId}`);

	const stripe = initStripe();

	const accountTypes = accountTypeOptions();

	const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);

	const items: Stripe.SubscriptionUpdateParams.Item[] = [];

	// First delete all the items that don't match the new account type. That
	// means for example deleting the "Joplin Cloud Pro" item if the new account
	// type is "Basic" and vice versa.
	for (const t of accountTypes) {
		if (!t.value) continue;

		const priceId = accountTypeToPriceId(t.value);
		const stripeSubItem = stripeSub.items.data.find(d => d.price.id === priceId);

		if (stripeSubItem) {
			if (accountTypeToPriceId(newAccountType) === priceId) throw new Error(`This account is already of type ${newAccountType}`);

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
		price: accountTypeToPriceId(newAccountType),
	});

	await stripe.subscriptions.update(sub.stripe_subscription_id, { items });
}
