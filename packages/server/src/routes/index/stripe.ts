import { SubPath, RouteHandler } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { bodyFields } from '../../utils/requestUtils';
import config from '../../config';
import { ErrorNotFound } from '../../utils/errors';
import { readCredentialFile } from '../../utils/testing/testUtils';

const router: Router = new Router(RouteType.Web);

router.public = true;

let stripe_: any = null;

interface StripeConfig {
	secretKey: string;
	publishableKey: string;
}

async function stripeConfig(): Promise<StripeConfig> {
	const r = await readCredentialFile('stripe_test.json');
	return JSON.parse(r);
}

async function initStripe(): Promise<any> {
	if (stripe_) return stripe_;

	const conf = await stripeConfig();
	stripe_ = require('stripe')(conf.secretKey);
	return stripe_;
}

interface CreateCheckoutSessionFields {
	priceId: string;
}

// curl -F priceId=price_xxxxxxxxxxx http://joplincloud.local:22300/stripe/createCheckoutSession

const postHandlers: Record<string, RouteHandler> = {

	createCheckoutSession: async (_path: SubPath, ctx: AppContext) => {
		const fields = await bodyFields<CreateCheckoutSessionFields>(ctx.req);
		const priceId = fields.priceId;
		const stripe = await initStripe();

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
			// {CHECKOUT_SESSION_ID} is a string literal; do not change it!
			// the actual Session ID is returned in the query parameter when your customer
			// is redirected to the success page.
			success_url: `${config().baseUrl}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${config().baseUrl}/stripe/cancel`,
		});

		return {
			sessionId: session.id,
		};
	},

};

const getHandlers: Record<string, RouteHandler> = {

	checkoutTest: async (_path: SubPath, _ctx: AppContext) => {
		const conf = await stripeConfig();

		return `
			<head>
				<title>Checkout</title>
				<script src="https://js.stripe.com/v3/"></script>

				<script>
					var stripe = Stripe(${JSON.stringify(conf.publishableKey)});

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
	return postHandlers[path.id](path, ctx);
});

router.get('stripe/:id', async (path: SubPath, ctx: AppContext) => {
	if (!getHandlers[path.id]) throw new ErrorNotFound(`No such action: ${path.id}`);
	return getHandlers[path.id](path, ctx);
});

export default router;
