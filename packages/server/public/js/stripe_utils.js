// function stripeConfig() {
// 	if (!joplin || !joplin.stripeConfig) throw new Error('Stripe config is not set');
// 	return joplin.stripeConfig;
// }

// function newStripe() {
// 	return Stripe(stripeConfig().publishableKey);
// }

// async function createStripeCheckoutSession(priceId) {
// 	const urlQuery = new URLSearchParams(location.search);
// 	const coupon = urlQuery.get('coupon') || '';

// 	console.info('Creating Stripe session for price:', priceId, 'Coupon:', coupon);

// 	const result = await fetch(`${stripeConfig().webhookBaseUrl}/stripe/createCheckoutSession`, {
// 		method: 'POST',
// 		headers: {
// 			'Content-Type': 'application/json',
// 		},
// 		body: JSON.stringify({
// 			priceId: priceId,
// 			coupon: coupon,
// 		}),
// 	});

// 	if (!result.ok) {
// 		console.error('Could not create Stripe checkout session', await result.text());
// 		alert('The checkout session could not be created. Please contact support@joplincloud.com for support.');
// 	} else {
// 		return result.json();
// 	}
// }

// async function startStripeCheckout(priceId) {
// 	const data = await createStripeCheckoutSession(stripeId);

// 	const result = await stripe.redirectToCheckout({
// 		sessionId: data.sessionId,
// 	});

// 	console.info('Redirected to checkout', result);
// }
