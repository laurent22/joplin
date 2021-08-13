import { View } from '../../services/MustacheService';
import { stripeConfig } from '../stripe';

export default function setupStripeView(view: View) {
	view.jsFiles.push('stripe_utils');
	view.content.stripeConfig = stripeConfig();
	view.content.stripeConfigJson = JSON.stringify(stripeConfig());
	return view;
}
