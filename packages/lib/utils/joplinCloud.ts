import * as fs from 'fs-extra';

export interface Plan {
	name: string;
	title: string;
	priceMonthly: StripePublicConfigPrice;
	priceYearly: StripePublicConfigPrice;
	featured: boolean;
	iconName: string;
	featuresOn: string[];
	featuresOff: string[];
	cfaLabel: string;
	cfaUrl: string;
}

export enum PricePeriod {
	Monthly = 'monthly',
	Yearly = 'yearly',
}

export enum PriceCurrency {
	EUR = 'EUR',
	GBP = 'GBP',
	USD = 'USD',
}

export interface StripePublicConfigPrice {
	accountType: number; // AccountType
	id: string;
	period: PricePeriod;
	amount: string;
	formattedAmount: string;
	formattedMonthlyAmount: string;
	currency: PriceCurrency;
}

export interface StripePublicConfig {
	publishableKey: string;
	prices: StripePublicConfigPrice[];
	webhookBaseUrl: string;
}

export interface PlanFeature {
	label: string;
	enabled: boolean;
}

export function getFeatureList(plan: Plan): PlanFeature[] {
	const output: PlanFeature[] = [];

	for (const f of plan.featuresOn) {
		output.push({
			label: f,
			enabled: true,
		});
	}

	for (const f of plan.featuresOff) {
		output.push({
			label: f,
			enabled: false,
		});
	}

	return output;
}

function formatPrice(amount: string | number, currency: PriceCurrency): string {
	amount = typeof amount === 'number' ? (Math.ceil(amount * 100) / 100).toFixed(2) : amount;
	if (currency === PriceCurrency.EUR) return `${amount}€`;
	if (currency === PriceCurrency.GBP) return `£${amount}`;
	if (currency === PriceCurrency.USD) return `$${amount}`;
	throw new Error(`Unsupported currency: ${currency}`);
}

interface FindPriceQuery {
	accountType?: number;
	period?: PricePeriod;
	priceId?: string;
}

export function loadStripeConfig(env: string, filePath: string): StripePublicConfig {
	const config: StripePublicConfig = JSON.parse(fs.readFileSync(filePath, 'utf8'))[env];
	if (!config) throw new Error(`Invalid env: ${env}`);

	config.prices = config.prices.map(p => {
		return {
			...p,
			formattedAmount: formatPrice(p.amount, p.currency),
			formattedMonthlyAmount: p.period === PricePeriod.Monthly ? formatPrice(p.amount, p.currency) : formatPrice(Number(p.amount) / 12, p.currency),
		};
	});

	return config;
}

export function findPrice(prices: StripePublicConfigPrice[], query: FindPriceQuery): StripePublicConfigPrice {
	let output: StripePublicConfigPrice = null;

	if (query.accountType && query.period) {
		output = prices.filter(p => p.accountType === query.accountType).find(p => p.period === query.period);
	} else if (query.priceId) {
		output = prices.find(p => p.id === query.priceId);
	} else {
		throw new Error(`Invalid query: ${JSON.stringify(query)}`);
	}

	if (!output) throw new Error(`Not found: ${JSON.stringify(query)}`);

	return output;
}

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
			priceMonthly: findPrice(stripeConfig.prices, {
				accountType: 1,
				period: PricePeriod.Monthly,
			}),
			priceYearly: findPrice(stripeConfig.prices, {
				accountType: 1,
				period: PricePeriod.Yearly,
			}),
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
			priceMonthly: findPrice(stripeConfig.prices, {
				accountType: 2,
				period: PricePeriod.Monthly,
			}),
			priceYearly: findPrice(stripeConfig.prices, {
				accountType: 2,
				period: PricePeriod.Yearly,
			}),
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
			priceMonthly: { accountType: 3, formattedMonthlyAmount: '49.99€' } as any,
			priceYearly: { accountType: 3, formattedMonthlyAmount: '39.99€', formattedAmount: '479.88€' } as any,
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
