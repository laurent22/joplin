import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType, StripeConfig } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { bodyFields } from '../../utils/requestUtils';
import globalConfig from '../../config';
import { ErrorForbidden, ErrorNotFound } from '../../utils/errors';
import { Stripe } from 'stripe';
import Logger from '@joplin/lib/Logger';
import getRawBody = require('raw-body');
import { AccountType } from '../../models/UserModel';
const stripeLib = require('stripe');

const logger = Logger.create('/stripe');

const router: Router = new Router(RouteType.Web);

router.public = true;

function stripeConfig(): StripeConfig {
	return globalConfig().stripe;
}

function initStripe(): Stripe {
	return stripeLib(stripeConfig().secretKey);
}

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
}

function priceIdToAccountType(priceId: string): AccountType {
	if (stripeConfig().basicPriceId === priceId) return AccountType.Basic;
	if (stripeConfig().proPriceId === priceId) return AccountType.Pro;
	throw new Error(`Unknown price ID: ${priceId}`);
}

type StripeRouteHandler = (stripe: Stripe, path: SubPath, ctx: AppContext)=> Promise<any>;

const postHandlers: Record<string, StripeRouteHandler> = {

	createCheckoutSession: async (stripe: Stripe, __path: SubPath, ctx: AppContext) => {
		const fields = await bodyFields<CreateCheckoutSessionFields>(ctx.req);
		const priceId = fields.priceId;

		// See https://stripe.com/docs/api/checkout/sessions/create
		// for additional parameters to pass.
		const session = await stripe.checkout.sessions.create({
			mode: 'subscription',
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
			// {CHECKOUT_SESSION_ID} is a string literal; do not change it!
			// the actual Session ID is returned in the query parameter when your customer
			// is redirected to the success page.
			success_url: `${globalConfig().baseUrl}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${globalConfig().baseUrl}/stripe/cancel`,
		});

		logger.info('Created checkout session', session.id);

		// Somehow Stripe doesn't send back the price ID to the hook when the
		// subscription is created, so we keep a map of sessions to price IDs so that we
		// can create the right account, either Basic or Pro.
		await ctx.joplin.models.keyValue().setValue(`stripeSessionToPriceId::${session.id}`, priceId);

		return {
			sessionId: session.id,
		};
	},

	// How to test the complete workflow locally:
	//
	// - In website/build.ts, set the env to "dev", then build the website - `npm run watch-website`
	// - Start the Stripe CLI tool: `stripe listen --forward-to http://joplincloud.local:22300/stripe/webhook`
	// - Copy the webhook secret, and paste it in joplin-credentials/server.env (under STRIPE_WEBHOOK_SECRET)
	// - Start the local Joplin Server, `npm run start-dev`, running under http://joplincloud.local:22300
	// - Start the workflow from http://localhost:8080/plans/
	// - The local website often is not configured to send email, but you can see them in the database, in the "emails" table.
	//
	// Stripe config:
	//
	// - The public config is under packages/server/stripeConfig.json
	// - The private config is in the server .env file

	webhook: async (stripe: Stripe, _path: SubPath, ctx: AppContext) => {
		const event = await stripeEvent(stripe, ctx.req);

		const hooks: any = {

			'checkout.session.completed': async () => {
				// Payment is successful and the subscription is created.
				//
				// For testing: `stripe trigger checkout.session.completed`
				// Or use /checkoutTest URL.

				// {
				//   "object": {
				//     "id": "cs_test_xxxxxxxxxxxxxxxxxx",
				//     "object": "checkout.session",
				//     "allow_promotion_codes": null,
				//     "amount_subtotal": 499,
				//     "amount_total": 499,
				//     "billing_address_collection": null,
				//     "cancel_url": "http://joplincloud.local:22300/stripe/cancel",
				//     "client_reference_id": null,
				//     "currency": "gbp",
				//     "customer": "cus_xxxxxxxxxxxx",
				//     "customer_details": {
				//       "email": "toto@example.com",
				//       "tax_exempt": "none",
				//       "tax_ids": [
				//       ]
				//     },
				//     "customer_email": null,
				//     "livemode": false,
				//     "locale": null,
				//     "metadata": {
				//     },
				//     "mode": "subscription",
				//     "payment_intent": null,
				//     "payment_method_options": {
				//     },
				//     "payment_method_types": [
				//       "card"
				//     ],
				//     "payment_status": "paid",
				//     "setup_intent": null,
				//     "shipping": null,
				//     "shipping_address_collection": null,
				//     "submit_type": null,
				//     "subscription": "sub_xxxxxxxxxxxxxxxx",
				//     "success_url": "http://joplincloud.local:22300/stripe/success?session_id={CHECKOUT_SESSION_ID}",
				//     "total_details": {
				//       "amount_discount": 0,
				//       "amount_shipping": 0,
				//       "amount_tax": 0
				//     }
				//   }
				// }

				const checkoutSession: Stripe.Checkout.Session = event.data.object as Stripe.Checkout.Session;
				const userEmail = checkoutSession.customer_details.email || checkoutSession.customer_email;

				logger.info('Checkout session completed:', checkoutSession.id);
				logger.info('User email:', userEmail);

				let accountType = AccountType.Basic;
				try {
					const priceId: string = await ctx.joplin.models.keyValue().value(`stripeSessionToPriceId::${checkoutSession.id}`);
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

				await ctx.joplin.models.subscription().saveUserAndSubscription(
					userEmail,
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
				await ctx.joplin.models.subscription().handlePayment(invoice.subscription as string, true);
			},

			'invoice.payment_failed': async () => {
				// The payment failed or the customer does not have a valid payment method.
				// The subscription becomes past_due. Notify your customer and send them to the
				// customer portal to update their payment information.
				//
				// For testing: `stripe trigger invoice.payment_failed`

				const invoice = event.data.object as Stripe.Invoice;
				const subId = invoice.subscription as string;
				await ctx.joplin.models.subscription().handlePayment(subId, false);
			},

		};

		if (hooks[event.type]) {
			logger.info(`Got Stripe event: ${event.type} [Handled]`);
			await hooks[event.type]();
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

	checkoutTest: async (_stripe: Stripe, _path: SubPath, _ctx: AppContext) => {
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
				<button id="checkout">Subscribe</button>
				<script>
					var PRICE_ID = 'price_1IvlmiLx4fybOTqJMKNZhLh2';

					function handleResult() {
						console.info('Redirected to checkout');
					}

					document
						.getElementById("checkout")
						.addEventListener("click", function(evt) {
							evt.preventDefault();

							// You'll have to define PRICE_ID as a price ID before this code block
							createCheckoutSession(PRICE_ID).then(function(data) {
								// Call Stripe.js method to redirect to the new Checkout page
								stripe
									.redirectToCheckout({
										sessionId: data.sessionId
									})
									.then(handleResult);
							});
						});
			
				</script>
			</body>
		`;
	},

};

router.post('stripe/:id', async (path: SubPath, ctx: AppContext) => {
	if (!postHandlers[path.id]) throw new ErrorNotFound(`No such action: ${path.id}`);
	return postHandlers[path.id](initStripe(), path, ctx);
});

router.get('stripe/:id', async (path: SubPath, ctx: AppContext) => {
	if (!getHandlers[path.id]) throw new ErrorNotFound(`No such action: ${path.id}`);
	return getHandlers[path.id](initStripe(), path, ctx);
});

export default router;
