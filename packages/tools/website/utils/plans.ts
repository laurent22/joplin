/* eslint-disable import/prefer-default-export */

import { Plan, StripePublicConfig } from './types';

const businessAccountEmailBody = `Hello,

This is an automatically generated email. The Business feature is coming soon, and in the meantime we offer a business discount if you would like to register multiple users.

If so please let us know the following details and we will get back to you as soon as possible:

- Name: 

- Email: 

- Number of users: `;

export function getPlans(stripeConfig: StripePublicConfig): Record<string, Plan> {
	const features = {
		publishNote: 'Publish notes to the internet',
		sync: 'Sync as many devices as you want',
		clipper: 'Web Clipper',
		collaborate: 'Share and collaborate on a notebook',
		multiUsers: 'Up to 10 users',
		prioritySupport: 'Priority support',
	};

	return {
		basic: {
			name: 'basic',
			title: 'Basic',
			price: '1.99€',
			stripePriceId: stripeConfig.basicPriceId,
			featured: false,
			iconName: 'basic-icon',
			featuresOn: [
				'Max 10 MB per note or attachment',
				features.publishNote,
				features.sync,
				features.clipper,
				'1 GB storage space',
			],
			featuresOff: [
				features.collaborate,
				features.multiUsers,
				features.prioritySupport,
			],
			cfaLabel: 'Try it now',
			cfaUrl: '',
		},

		pro: {
			name: 'pro',
			title: 'Pro',
			price: '5.99€',
			stripePriceId: stripeConfig.proPriceId,
			featured: true,
			iconName: 'pro-icon',
			featuresOn: [
				'Max 200 MB per note or attachment',
				features.publishNote,
				features.sync,
				features.clipper,
				'10 GB storage space',
				features.collaborate,
			],
			featuresOff: [
				features.multiUsers,
				features.prioritySupport,
			],
			cfaLabel: 'Try it now',
			cfaUrl: '',
		},

		business: {
			name: 'business',
			title: 'Business',
			price: '49.99€',
			stripePriceId: '',
			featured: false,
			iconName: 'business-icon',
			featuresOn: [
				'Max 200 MB per note or attachment',
				features.publishNote,
				features.sync,
				features.clipper,
				'10 GB storage space',
				features.collaborate,
				features.multiUsers,
				features.prioritySupport,
			],
			featuresOff: [],
			cfaLabel: 'Contact us',
			cfaUrl: `mailto:business@joplincloud.com?subject=${encodeURIComponent('Joplin Cloud Business Account Order')}&body=${encodeURIComponent(businessAccountEmailBody)}`,
		},
	};
}
