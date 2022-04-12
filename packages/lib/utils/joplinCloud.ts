import * as fs from 'fs-extra';
import markdownUtils, { MarkdownTableHeader, MarkdownTableRow } from '../markdownUtils';

type FeatureId = string;

export enum PlanName {
	Basic = 'basic',
	Pro = 'pro',
	Teams = 'teams',
}

interface PlanFeature {
	title: string;
	basic: boolean;
	pro: boolean;
	teams: boolean;
	basicInfo?: string;
	proInfo?: string;
	teamsInfo?: string;
	basicInfoShort?: string;
	proInfoShort?: string;
	teamsInfoShort?: string;
}

export interface Plan {
	name: string;
	title: string;
	priceMonthly: StripePublicConfigPrice;
	priceYearly: StripePublicConfigPrice;
	featured: boolean;
	iconName: string;
	featuresOn: FeatureId[];
	featuresOff: FeatureId[];
	featureLabelsOn: string[];
	featureLabelsOff: string[];
	cfaLabel: string;
	cfaUrl: string;
	footnote: string;
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

const features: Record<FeatureId, PlanFeature> = {
	maxItemSize: {
		title: 'Max note or attachment size',
		basic: true,
		pro: true,
		teams: true,
		basicInfo: '10 MB per note or attachment',
		proInfo: '200 MB per note or attachment',
		teamsInfo: '200 MB per note or attachment',
		basicInfoShort: '10 MB',
		proInfoShort: '200 MB',
		teamsInfoShort: '200 MB',
	},
	maxStorage: {
		title: 'Storage space',
		basic: true,
		pro: true,
		teams: true,
		basicInfo: '1 GB storage space',
		proInfo: '10 GB storage space',
		teamsInfo: '10 GB storage space',
		basicInfoShort: '1 GB',
		proInfoShort: '10 GB',
		teamsInfoShort: '10 GB',
	},
	publishNote: {
		title: 'Publish notes to the internet',
		basic: true,
		pro: true,
		teams: true,
	},
	sync: {
		title: 'Sync as many devices as you want',
		basic: true,
		pro: true,
		teams: true,
	},
	clipper: {
		title: 'Web Clipper',
		basic: true,
		pro: true,
		teams: true,
	},
	collaborate: {
		title: 'Share and collaborate on a notebook',
		basic: false,
		pro: true,
		teams: true,
	},
	multiUsers: {
		title: 'Manage multiple users',
		basic: false,
		pro: false,
		teams: true,
	},
	consolidatedBilling: {
		title: 'Consolidated billing',
		basic: false,
		pro: false,
		teams: true,
	},
	sharingAccessControl: {
		title: 'Sharing access control',
		basic: false,
		pro: false,
		teams: true,
	},
	prioritySupport: {
		title: 'Priority support',
		basic: false,
		pro: false,
		teams: true,
	},
};

export const getFeatureIdsByPlan = (planName: PlanName, featureOn: boolean): FeatureId[] => {
	const output: FeatureId[] = [];

	for (const [k, v] of Object.entries(features)) {
		if (v[planName] === featureOn) {
			output.push(k);
		}
	}

	return output;
};

export const getFeatureLabelsByPlan = (planName: PlanName, featureOn: boolean): string[] => {
	const output: FeatureId[] = [];

	for (const [featureId, v] of Object.entries(features)) {
		if (v[planName] === featureOn) {
			output.push(getFeatureLabel(planName, featureId));
		}
	}

	return output;
};

export const getAllFeatureIds = (): FeatureId[] => {
	return Object.keys(features);
};

export const getFeatureById = (featureId: FeatureId): PlanFeature => {
	return features[featureId];
};

export const getFeaturesByPlan = (planName: PlanName, featureOn: boolean): PlanFeature[] => {
	const output: PlanFeature[] = [];

	for (const [, v] of Object.entries(features)) {
		if (v[planName] === featureOn) {
			output.push(v);
		}
	}

	return output;
};

export const getFeatureLabel = (planName: PlanName, featureId: FeatureId): string => {
	const feature = features[featureId];
	const k = `${planName}Info`;
	if ((feature as any)[k]) return (feature as any)[k];
	return feature.title;
};

export const getFeatureEnabled = (planName: PlanName, featureId: FeatureId): boolean => {
	const feature = features[featureId];
	return feature[planName];
};

export const createFeatureTableMd = () => {
	const headers: MarkdownTableHeader[] = [
		{
			name: 'featureLabel',
			label: 'Feature',
		},
		{
			name: 'basic',
			label: 'Basic',
		},
		{
			name: 'pro',
			label: 'Pro',
		},
		{
			name: 'teams',
			label: 'Teams',
		},
	];

	const rows: MarkdownTableRow[] = [];

	const getCellInfo = (planName: PlanName, feature: PlanFeature) => {
		if (!feature[planName]) return '-';
		const infoShort: string = (feature as any)[`${planName}InfoShort`];
		if (infoShort) return infoShort;
		return '✔️';
	};

	for (const [, feature] of Object.entries(features)) {
		const row: MarkdownTableRow = {
			featureLabel: feature.title,
			basic: getCellInfo(PlanName.Basic, feature),
			pro: getCellInfo(PlanName.Pro, feature),
			teams: getCellInfo(PlanName.Teams, feature),
		};

		rows.push(row);
	}

	return markdownUtils.createMarkdownTable(headers, rows);
};

export function getPlans(stripeConfig: StripePublicConfig): Record<PlanName, Plan> {
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
			featuresOn: getFeatureIdsByPlan(PlanName.Basic, true),
			featuresOff: getFeatureIdsByPlan(PlanName.Basic, false),
			featureLabelsOn: getFeatureLabelsByPlan(PlanName.Basic, true),
			featureLabelsOff: getFeatureLabelsByPlan(PlanName.Basic, false),
			cfaLabel: 'Try it now',
			cfaUrl: '',
			footnote: '',
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
			featuresOn: getFeatureIdsByPlan(PlanName.Pro, true),
			featuresOff: getFeatureIdsByPlan(PlanName.Pro, false),
			featureLabelsOn: getFeatureLabelsByPlan(PlanName.Pro, true),
			featureLabelsOff: getFeatureLabelsByPlan(PlanName.Pro, false),
			cfaLabel: 'Try it now',
			cfaUrl: '',
			footnote: '',
		},

		teams: {
			name: 'teams',
			title: 'Teams',
			priceMonthly: findPrice(stripeConfig.prices, {
				accountType: 3,
				period: PricePeriod.Monthly,
			}),
			priceYearly: findPrice(stripeConfig.prices, {
				accountType: 3,
				period: PricePeriod.Yearly,
			}),
			featured: false,
			iconName: 'business-icon',
			featuresOn: getFeatureIdsByPlan(PlanName.Teams, true),
			featuresOff: getFeatureIdsByPlan(PlanName.Teams, false),
			featureLabelsOn: getFeatureLabelsByPlan(PlanName.Teams, true),
			featureLabelsOff: getFeatureLabelsByPlan(PlanName.Teams, false),
			cfaLabel: 'Try it now',
			cfaUrl: '',
			footnote: 'Per user. Minimum of 2 users.',
		},
	};
}
