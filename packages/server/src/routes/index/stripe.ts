import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { bodyFields } from '../../utils/requestUtils';
import globalConfig from '../../config';
import { ErrorForbidden, ErrorNotFound } from '../../utils/errors';
import { Stripe } from 'stripe';
import Logger from '@joplin/lib/Logger';
import getRawBody = require('raw-body');
import { AccountType } from '../../models/UserModel';
import { betaUserTrialPeriodDays, cancelSubscription, initStripe, isBetaUser, priceIdToAccountType, stripeConfig } from '../../utils/stripe';
import { Subscription, UserFlagType } from '../../services/database/types';
import { findPrice, PricePeriod } from '@joplin/lib/utils/joplinCloud';
import { Models } from '../../models/factory';

const logger = Logger.create('/stripe');

const router: Router = new Router(RouteType.Web);

router.public = true;

async function stripeEvent(stripe: Stripe, req: any): Promise<Stripe.Event> {
	if (!stripeConfig().webhookSecret) throw new Error('webhookSecret is required');

	const body = await getRawBody(req);

	return stripe.webhooks.constructEvent(
		body,
		req.headers['stripe-signature'],
		stripeConfig().webhookSecret
	);
}

interface CreateCheckoutSessionFields {
	priceId: string;
	coupon: string;
	email: string;
}

type StripeRouteHandler = (stripe: Stripe, path: SubPath, ctx: AppContext)=> Promise<any>;

interface PostHandlers {
	createCheckoutSession: Function;
	webhook: Function;
}

interface SubscriptionInfo {
	sub: Subscription;
	stripeSub: Stripe.Subscription;
}

async function getSubscriptionInfo(event: Stripe.Event, ctx: AppContext): Promise<SubscriptionInfo> {
	const stripeSub = event.data.object as Stripe.Subscription;
	const sub = await ctx.joplin.models.subscription().byStripeSubscriptionId(stripeSub.id);
	if (!sub) throw new Error(`No subscription with ID: ${stripeSub.id}`);
	return { sub, stripeSub };
}

export const handleSubscriptionCreated = async (stripe: Stripe, models: Models, customerName: string, userEmail: string, accountType: AccountType, stripeUserId: string, stripeSubscriptionId: string) => {
	const existingUser = await models.user().loadByEmail(userEmail);

	if (existingUser) {
		const sub = await models.subscription().byUserId(existingUser.id);

		if (!sub) {
			logger.info(`Setting up subscription for existing user: ${existingUser.email}`);

			// First set the account type correctly (in case the
			// user also upgraded or downgraded their account).
			await models.user().save({
				id: existingUser.id,
				account_type: accountType,
			});

			// Also clear any payment and subscription related flags
			// since if we're here it means payment was successful
			await models.userFlag().removeMulti(existingUser.id, [
				UserFlagType.FailedPaymentWarning,
				UserFlagType.FailedPaymentFinal,
				UserFlagType.SubscriptionCancelled,
				UserFlagType.AccountWithoutSubscription,
			]);

			// Then save the subscription
			await models.subscription().save({
				user_id: existingUser.id,
				stripe_user_id: stripeUserId,
				stripe_subscription_id: stripeSubscriptionId,
				last_payment_time: Date.now(),
			});
		} else {
			if (sub.stripe_subscription_id === stripeSubscriptionId) {
				// Stripe probably dispatched a "customer.subscription.created"
				// event after "checkout.session.completed", so we already have
				// save the subscription and can skip processing.
			} else {
				// The user already has a subscription. Most likely
				// they accidentally created a second one, so cancel
				// it.
				logger.info(`User ${existingUser.email} already has a subscription: ${sub.stripe_subscription_id} - cancelling duplicate`);
				await cancelSubscription(stripe, stripeSubscriptionId);
			}
		}
	} else {
		logger.info(`Creating subscription for new user: ${userEmail}`);

		await models.subscription().saveUserAndSubscription(
			userEmail,
			customerName,
			accountType,
			stripeUserId,
			stripeSubscriptionId
		);
	}
};

export const postHandlers: PostHandlers = {

	createCheckoutSession: async (stripe: Stripe, __path: SubPath, ctx: AppContext) => {
		const fields = await bodyFields<CreateCheckoutSessionFields>(ctx.req);
		const priceId = fields.priceId;

		const checkoutSession: Stripe.Checkout.SessionCreateParams = {
			mode: 'subscription',
			// Stripe supports many payment method types but it seems only
			// "card" is supported for recurring subscriptions.
			payment_method_types: ['card'],
			line_items: [
				{
					price: priceId,
					// For metered billing, do not pass quantity
					quantity: 1,
				},
			],
			subscription_data: {
				trial_period_days: 14,
			},
			allow_promotion_codes: true,
			// {CHECKOUT_SESSION_ID} is a string literal; do not change it!
			// the actual Session ID is returned in the query parameter when your customer
			// is redirected to the success page.
			success_url: `${globalConfig().baseUrl}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${globalConfig().baseUrl}/stripe/cancel`,
		};

		if (fields.coupon) {
			delete checkoutSession.allow_promotion_codes;

			checkoutSession.discounts = [
				{
					coupon: fields.coupon.trim(),
				},
			];
		}

		if (fields.email) {
			checkoutSession.customer_email = fields.email.trim();

			// If it's a Beta user, we set the trial end period to the end of
			// the beta period. So for example if there's 7 weeks left on the
			// Beta period, the trial will be 49 days. This is so Beta users can
			// setup the subscription at any time without losing the free beta
			// period.
			const existingUser = await ctx.joplin.models.user().loadByEmail(checkoutSession.customer_email);
			if (existingUser && await isBetaUser(ctx.joplin.models, existingUser.id)) {
				checkoutSession.subscription_data.trial_period_days = betaUserTrialPeriodDays(existingUser.created_time);
			}
		}

		// See https://stripe.com/docs/api/checkout/sessions/create
		// for additional parameters to pass.
		const session = await stripe.checkout.sessions.create(checkoutSession);

		logger.info('Created checkout session', session.id);

		// Somehow Stripe doesn't send back the price ID to the hook when the
		// subscription is created, so we keep a map of sessions to price IDs so that we
		// can create the right account, either Basic or Pro.
		await ctx.joplin.models.keyValue().setValue(`stripeSessionToPriceId::${session.id}`, priceId);

		return { sessionId: session.id };
	},

	// # How to test the complete workflow locally
	//
	// - In website/build.ts, set the env to "dev", then build the website - `npm run watch-website`
	// - Start the Stripe CLI tool: `stripe listen --forward-to http://joplincloud.local:22300/stripe/webhook`
	// - Copy the webhook secret, and paste it in joplin-credentials/server.env (under STRIPE_WEBHOOK_SECRET)
	// - Start the local Joplin Server, `npm run start-dev`, running under http://joplincloud.local:22300
	// - Start the workflow from http://localhost:8077/plans/
	// - The local website often is not configured to send email, but you can see them in the database, in the "emails" table.
	//
	// # Simplified workflow
	//
	// To test without running the main website, use http://joplincloud.local:22300/stripe/checkoutTest
	//
	// # Stripe config
	//
	// - The public config is under packages/server/stripeConfig.json
	// - The private config is in the server .env file
	//
	// # Failed Stripe cli login
	//
	// If the tool show this error, with code "api_key_expired":
	//
	// > FATAL Error while authenticating with Stripe: Authorization failed
	//
	// Need to logout and login again to refresh the CLI token - `stripe logout && stripe login`

	webhook: async (stripe: Stripe, _path: SubPath, ctx: AppContext, event: Stripe.Event = null, logErrors: boolean = true) => {
		event = event ? event : await stripeEvent(stripe, ctx.req);

		const models = ctx.joplin.models;

		// Webhook endpoints might occasionally receive the same event more than
		// once.
		// https://stripe.com/docs/webhooks/best-practices#duplicate-events
		const eventDoneKey = `stripeEventDone::${event.id}`;
		if (await models.keyValue().value<number>(eventDoneKey)) {
			logger.info(`Skipping event that has already been done: ${event.id}`);
			return;
		}
		await models.keyValue().setValue(eventDoneKey, 1);

		const hooks: any = {

			'checkout.session.completed': async () => {
				// Payment is successful and the subscription is created.
				//
				// For testing: `stripe trigger checkout.session.completed`
				// Or use /checkoutTest URL.

				const checkoutSession: Stripe.Checkout.Session = event.data.object as Stripe.Checkout.Session;
				const userEmail = checkoutSession.customer_details.email || checkoutSession.customer_email;

				let customerName = '';
				try {
					const customer = await stripe.customers.retrieve(checkoutSession.customer as string) as Stripe.Customer;
					customerName = customer.name;
				} catch (error) {
					logger.error('Could not fetch customer information:', error);
				}

				logger.info('Checkout session completed:', checkoutSession.id);
				logger.info('User email:', userEmail);
				logger.info('User name:', customerName);

				let accountType = AccountType.Basic;
				try {
					const priceId: string = await models.keyValue().value(`stripeSessionToPriceId::${checkoutSession.id}`);
					accountType = priceIdToAccountType(priceId);
					logger.info('Price ID:', priceId);
				} catch (error) {
					// We don't want this part to fail since the user has
					// already paid at that point, so we just default to Basic
					// in that case. Normally it shoud not happen anyway.
					logger.error('Could not determine account type from price ID - defaulting to "Basic"', error);
				}

				logger.info('Account type:', accountType);

				// The Stripe TypeScript object defines "customer" and
				// "subscription" as various types but they are actually
				// string according to the documentation.
				const stripeUserId = checkoutSession.customer as string;
				const stripeSubscriptionId = checkoutSession.subscription as string;

				await handleSubscriptionCreated(
					stripe,
					models,
					customerName,
					userEmail,
					accountType,
					stripeUserId,
					stripeSubscriptionId
				);
			},

			'customer.subscription.created': async () => {
				const stripeSub: Stripe.Subscription = event.data.object as Stripe.Subscription;
				const stripeUserId = stripeSub.customer as string;
				const stripeSubscriptionId = stripeSub.id;
				const customer = await stripe.customers.retrieve(stripeUserId) as Stripe.Customer;

				let accountType = AccountType.Basic;
				try {
					// Really have to dig out the price ID
					const priceId = stripeSub.items.data[0].price.id;
					accountType = priceIdToAccountType(priceId);
				} catch (error) {
					logger.error('Could not determine account type from price ID - defaulting to "Basic"', error);
				}

				await handleSubscriptionCreated(
					stripe,
					models,
					customer.name,
					customer.email,
					accountType,
					stripeUserId,
					stripeSubscriptionId
				);
			},

			'invoice.paid': async () => {
				// Continue to provision the subscription as payments continue
				// to be made. Store the status in your database and check when
				// a user accesses your service. This approach helps you avoid
				// hitting rate limits.
				//
				// Note that when the subscription is created, this event is
				// going to be triggered before "checkout.session.completed" (at
				// least in tests), which means it won't find the subscription
				// at this point, but this is fine because the required data is
				// saved in checkout.session.completed.

				const invoice = event.data.object as Stripe.Invoice;
				await models.subscription().handlePayment(invoice.subscription as string, true);
			},

			'invoice.payment_failed': async () => {
				// The payment failed or the customer does not have a valid payment method.
				// The subscription becomes past_due. Notify your customer and send them to the
				// customer portal to update their payment information.
				//
				// For testing: `stripe trigger invoice.payment_failed`

				const invoice = event.data.object as Stripe.Invoice;
				const subId = invoice.subscription as string;
				await models.subscription().handlePayment(subId, false);
			},

			'customer.subscription.deleted': async () => {
				// The subscription has been cancelled, either by us or directly
				// by the user. In that case, we disable the user.

				const { sub } = await getSubscriptionInfo(event, ctx);
				await models.subscription().toggleSoftDelete(sub.id, true);
				await models.userFlag().add(sub.user_id, UserFlagType.SubscriptionCancelled);
			},

			'customer.subscription.updated': async () => {
				// The subscription has been updated - we apply the changes from
				// Stripe to the local account.

				const { sub, stripeSub } = await getSubscriptionInfo(event, ctx);
				const newAccountType = priceIdToAccountType(stripeSub.items.data[0].price.id);
				const user = await models.user().load(sub.user_id, { fields: ['id'] });
				if (!user) throw new Error(`No such user: ${user.id}`);

				logger.info(`Updating subscription of user ${user.id} to ${newAccountType}`);
				await models.user().save({ id: user.id, account_type: newAccountType });
			},

		};

		if (hooks[event.type]) {
			logger.info(`Got Stripe event: ${event.type} [Handled]`);
			try {
				await hooks[event.type]();
			} catch (error) {
				if (logErrors) {
					logger.error(`Error processing event ${event.type}:`, event, error);
				} else {
					throw error;
				}
			}
		} else {
			logger.info(`Got Stripe event: ${event.type} [Unhandled]`);
		}
	},

};

const getHandlers: Record<string, StripeRouteHandler> = {

	success: async (_stripe: Stripe, _path: SubPath, _ctx: AppContext) => {
		return `
			<p>Thank you for signing up for ${globalConfig().appName}! You should receive an email shortly with instructions on how to connect to your account.</p>
			<p><a href="https://joplinapp.org">Go back to JoplinApp.org</a></p>
		`;
	},

	cancel: async (_stripe: Stripe, _path: SubPath, _ctx: AppContext) => {
		return `
			<p>Your payment has been cancelled.</p>
			<p><a href="https://joplinapp.org">Go back to JoplinApp.org</a></p>
		`;
	},

	portal: async (stripe: Stripe, _path: SubPath, ctx: AppContext) => {
		if (!ctx.joplin.owner) throw new ErrorForbidden('Please login to access the subscription portal');

		const sub = await ctx.joplin.models.subscription().byUserId(ctx.joplin.owner.id);
		if (!sub) throw new ErrorNotFound('Could not find subscription');

		const billingPortalSession = await stripe.billingPortal.sessions.create({ customer: sub.stripe_user_id as string });
		return `
			<html>
				<head>
				<meta http-equiv = "refresh" content = "1; url = ${billingPortalSession.url};" />
				<script>setTimeout(() => { window.location.href = ${JSON.stringify(billingPortalSession.url)}; }, 2000)</script>
				</head>
				<body>
					Redirecting to subscription portal...
				</body>
			</html>`;
	},

	checkoutTest: async (_stripe: Stripe, _path: SubPath, ctx: AppContext) => {
		const basicPrice = findPrice(stripeConfig().prices, { accountType: 1, period: PricePeriod.Monthly });
		const proPrice = findPrice(stripeConfig().prices, { accountType: 2, period: PricePeriod.Monthly });

		const customPriceId = ctx.request.query.price_id;

		return `
			<head>
				<title>Checkout</title>
				<script src="https://js.stripe.com/v3/"></script>

				<script>
					var stripe = Stripe(${JSON.stringify(stripeConfig().publishableKey)});

					var createCheckoutSession = function(priceId) {
						return fetch("/stripe/createCheckoutSession", {
							method: "POST",
							headers: {
								"Content-Type": "application/json"
							},
							body: JSON.stringify({
								priceId: priceId
							})
						}).then(function(result) {
							return result.json();
						});
					};
				</script>
			</head>
			<body>
				<button id="checkout_basic">Subscribe Basic</button>
				<button id="checkout_pro">Subscribe Pro</button>
				<button id="checkout_custom">Subscribe Custom</button>
				<script>
					var BASIC_PRICE_ID = ${JSON.stringify(basicPrice.id)};
					var PRO_PRICE_ID = ${JSON.stringify(proPrice.id)};
					var CUSTOM_PRICE_ID = ${JSON.stringify(customPriceId)};

					if (!CUSTOM_PRICE_ID) {
						document.getElementById('checkout_custom').style.display = 'none';
					}

					function handleResult() {
						console.info('Redirected to checkout');
					}

					function createSessionAndRedirect(priceId) {
						createCheckoutSession(priceId).then(function(data) {
							// Call Stripe.js method to redirect to the new Checkout page
							stripe
								.redirectToCheckout({
									sessionId: data.sessionId
								})
								.then(handleResult);
						});
					}

					document.getElementById("checkout_basic").addEventListener("click", function(evt) {
						evt.preventDefault();
						createSessionAndRedirect(BASIC_PRICE_ID);
					});

					document.getElementById("checkout_pro").addEventListener("click", function(evt) {
						evt.preventDefault();
						createSessionAndRedirect(PRO_PRICE_ID);
					});

					document.getElementById("checkout_custom").addEventListener("click", function(evt) {
						evt.preventDefault();
						createSessionAndRedirect(CUSTOM_PRICE_ID);
					});
				</script>
			</body>
		`;
	},

};

router.post('stripe/:id', async (path: SubPath, ctx: AppContext) => {
	if (!(postHandlers as any)[path.id]) throw new ErrorNotFound(`No such action: ${path.id}`);
	return (postHandlers as any)[path.id](initStripe(), path, ctx);
});

router.get('stripe/:id', async (path: SubPath, ctx: AppContext) => {
	if (!getHandlers[path.id]) throw new ErrorNotFound(`No such action: ${path.id}`);
	return getHandlers[path.id](initStripe(), path, ctx);
});

export default router;
