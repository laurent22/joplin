import { redirect, SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { Env, RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { bodyFields } from '../../utils/requestUtils';
import globalConfig from '../../config';
import { ErrorBadRequest, ErrorForbidden, ErrorNotFound } from '../../utils/errors';
import { Stripe } from 'stripe';
import Logger from '@joplin/lib/Logger';
import getRawBody = require('raw-body');
import { AccountType } from '../../models/UserModel';
import { betaUserTrialPeriodDays, cancelSubscription, initStripe, isBetaUser, priceIdToAccountType, stripeConfig } from '../../utils/stripe';
import { Subscription, User, UserFlagType } from '../../services/database/types';
import { findPrice, PricePeriod } from '@joplin/lib/utils/joplinCloud';
import { Models } from '../../models/factory';
import { confirmUrl } from '../../utils/urlUtils';
import { msleep } from '../../utils/time';

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
	promotionCode: string;
	email: string;
}

type StripeRouteHandler = (stripe: Stripe, path: SubPath, ctx: AppContext)=> Promise<any>;

interface PostHandlers {
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	createCheckoutSession: Function;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
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
		logger.info(`Creating subscription for new user: ${customerName} (${userEmail})`);

		await models.subscription().saveUserAndSubscription(
			userEmail,
			customerName,
			accountType,
			stripeUserId,
			stripeSubscriptionId
		);
	}
};

// For some reason, after checkout Stripe redirects to success_url immediately,
// without waiting for the "checkout.session.completed" event to be completed.
// It may be because they expect the webhook to immediately return code 200,
// which is not how it's currently implemented here.
// https://stripe.com/docs/payments/checkout/fulfill-orders#fulfill
//
// It means that by the time success_url is called, the user hasn't been created
// yet. So here we wait for the user to be available and return it. It shouldn't
// wait for more than 2-3 seconds.
const waitForUserCreation = async (models: Models, userEmail: string): Promise<User | null> => {
	for (let i = 0; i < 10; i++) {
		const user = await models.user().loadByEmail(userEmail);
		if (user) return user;
		await msleep(1000);
	}
	return null;
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
			checkoutSession.discounts = [
				{
					coupon: fields.coupon.trim(),
				},
			];
		} else if (fields.promotionCode) {
			const p = await stripe.promotionCodes.list({ code: fields.promotionCode });
			const codes = p.data;
			if (!codes.length) throw new ErrorBadRequest(`Could not find promotion code: ${fields.promotionCode}`);

			// Should not be possible in our setup since a unique code is
			// created for each customer.
			if (codes.length > 1) console.warn(`Found more than one promotion code: ${fields.promotionCode}`);

			checkoutSession.discounts = [
				{
					promotion_code: codes[0].id,
				},
			];
		}

		// "You may only specify one of these parameters: allow_promotion_codes, discounts"
		if (checkoutSession.discounts) delete checkoutSession.allow_promotion_codes;

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

	webhook: async (stripe: Stripe, _path: SubPath, ctx: AppContext, event: Stripe.Event = null, logErrors = true) => {
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

		type HookFunction = ()=> Promise<void>;

		const hooks: Record<string, HookFunction> = {

			// Stripe says that handling this event is required, and to
			// provision the subscription at that point:
			//
			// https://stripe.com/docs/billing/subscriptions/build-subscription?ui=checkout#provision-and-monitor
			//
			// But it's strange because it doesn't contain any info about the
			// subscription. In fact we don't need this event at all, we only
			// need "customer.subscription.created", which is sent at the same
			// time and actually contains the subscription info.

			'checkout.session.completed': async () => {
				const checkoutSession: Stripe.Checkout.Session = event.data.object as Stripe.Checkout.Session;
				const userEmail = checkoutSession.customer_details.email || checkoutSession.customer_email;
				logger.info('Checkout session completed:', checkoutSession.id);
				logger.info('User email:', userEmail);
			},

			// 'checkout.session.completed': async () => {
			// 	// Payment is successful and the subscription is created.
			// 	//
			// 	// For testing: `stripe trigger checkout.session.completed`
			// 	// Or use /checkoutTest URL.

			// 	const checkoutSession: Stripe.Checkout.Session = event.data.object as Stripe.Checkout.Session;
			// 	const userEmail = checkoutSession.customer_details.email || checkoutSession.customer_email;

			// 	let customerName = '';
			// 	try {
			// 		const customer = await stripe.customers.retrieve(checkoutSession.customer as string) as Stripe.Customer;
			// 		customerName = customer.name;
			// 	} catch (error) {
			// 		logger.error('Could not fetch customer information:', error);
			// 	}

			// 	logger.info('Checkout session completed:', checkoutSession.id);
			// 	logger.info('User email:', userEmail);
			// 	logger.info('User name:', customerName);

			// 	let accountType = AccountType.Basic;
			// 	try {
			// 		const priceId: string = await models.keyValue().value(`stripeSessionToPriceId::${checkoutSession.id}`);
			// 		accountType = priceIdToAccountType(priceId);
			// 		logger.info('Price ID:', priceId);
			// 	} catch (error) {
			// 		// We don't want this part to fail since the user has
			// 		// already paid at that point, so we just default to Basic
			// 		// in that case. Normally it shoud not happen anyway.
			// 		logger.error('Could not determine account type from price ID - defaulting to "Basic"', error);
			// 	}

			// 	logger.info('Account type:', accountType);

			// 	// The Stripe TypeScript object defines "customer" and
			// 	// "subscription" as various types but they are actually
			// 	// string according to the documentation.
			// 	const stripeUserId = checkoutSession.customer as string;
			// 	const stripeSubscriptionId = checkoutSession.subscription as string;

			// 	await handleSubscriptionCreated(
			// 		stripe,
			// 		models,
			// 		customerName,
			// 		userEmail,
			// 		accountType,
			// 		stripeUserId,
			// 		stripeSubscriptionId
			// 	);
			// },

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

	success: async (stripe: Stripe, _path: SubPath, ctx: AppContext) => {
		try {
			const models = ctx.joplin.models;
			const checkoutSession = await stripe.checkout.sessions.retrieve(ctx.query.session_id as string);
			const userEmail = checkoutSession.customer_details.email || checkoutSession.customer_email; // customer_email appears to be always null but fallback to it just in case
			if (!userEmail) throw new Error(`Could not find email from checkout session: ${JSON.stringify(checkoutSession)}`);
			const user = await waitForUserCreation(models, userEmail);
			if (!user) throw new Error(`Could not find user from checkout session: ${JSON.stringify(checkoutSession)}`);
			const validationToken = await ctx.joplin.models.token().generate(user.id);
			const redirectUrl = encodeURI(confirmUrl(user.id, validationToken, false));
			return redirect(ctx, redirectUrl);
		} catch (error) {
			logger.error('Could not automatically redirect user to account confirmation page. They will have to follow the link in the confirmation email. Error was:', error);
			return `
				<p>Thank you for signing up for ${globalConfig().appName}! You should receive an email shortly with instructions on how to connect to your account.</p>
				<p><a href="https://joplinapp.org">Go back to JoplinApp.org</a></p>
			`;
		}
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
				<meta http-equiv = "refresh" content = "1; url = ${billingPortalSession.url}" />
				<script>setTimeout(() => { window.location.href = ${JSON.stringify(billingPortalSession.url)}; }, 2000)</script>
				</head>
				<body>
					Redirecting to subscription portal...
				</body>
			</html>`;
	},

	checkoutTest: async (_stripe: Stripe, _path: SubPath, ctx: AppContext) => {
		if (globalConfig().env === Env.Prod) throw new ErrorForbidden();

		const basicPrice = findPrice(stripeConfig().prices, { accountType: 1, period: PricePeriod.Monthly });
		const proPrice = findPrice(stripeConfig().prices, { accountType: 2, period: PricePeriod.Monthly });

		const customPriceId = ctx.request.query.price_id;

		return `
			<head>
				<title>Checkout</title>
				<script src="https://js.stripe.com/v3/"></script>

				<script>
					var stripe = Stripe(${JSON.stringify(stripeConfig().publishableKey)});

					var createCheckoutSession = function(priceId, promotionCode) {
						return fetch("/stripe/createCheckoutSession", {
							method: "POST",
							headers: {
								"Content-Type": "application/json"
							},
							body: JSON.stringify({
								priceId,
								promotionCode,
							})
						}).then(function(result) {
							return result.json();
						});
					};
				</script>
			</head>
			<body>
				Promotion code: <input id="promotion_code" type="text"/> <br/>
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
						var promotionCode = document.getElementById('promotion_code').value;

						createCheckoutSession(priceId, promotionCode).then(function(data) {
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
