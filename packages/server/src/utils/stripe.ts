import globalConfig from '../config';
import { StripeConfig } from './types';
import { Stripe } from 'stripe';
import { Uuid } from '../db';
import { Models } from '../models/factory';
const stripeLib = require('stripe');

export function stripeConfig(): StripeConfig {
	return globalConfig().stripe;
}

export function initStripe(): Stripe {
	return stripeLib(stripeConfig().secretKey);
}

export async function cancelSubscription(models: Models, userId: Uuid) {
	const sub = await models.subscription().byUserId(userId);
	if (!sub) throw new Error(`No subscription for user: ${userId}`);
	const stripe = initStripe();
	await stripe.subscriptions.del(sub.stripe_subscription_id);
}
