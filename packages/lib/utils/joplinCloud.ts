import * as fs from 'fs-extra';
import markdownUtils, { MarkdownTableHeader, MarkdownTableRow } from '../markdownUtils';
import { _ } from '../locale';
import { htmlentities } from '@joplin/utils/html';

type FeatureId = string;

export enum PlanName {
	Basic = 'basic',
	Pro = 'pro',
	Teams = 'teams',
}

interface PlanFeature {
	title: string;
	description?: string;
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
	archivedPrices: StripePublicConfigPrice[];
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

	const decoratePrices = (p: StripePublicConfigPrice) => {
		return {
			...p,
			formattedAmount: formatPrice(p.amount, p.currency),
			formattedMonthlyAmount: p.period === PricePeriod.Monthly ? formatPrice(p.amount, p.currency) : formatPrice(Number(p.amount) / 12, p.currency),
		};
	};

	config.prices = config.prices.map(decoratePrices);
	config.archivedPrices = config.archivedPrices.map(decoratePrices);

	return config;
}

export function findPrice(config: StripePublicConfig, query: FindPriceQuery): StripePublicConfigPrice {
	let output: StripePublicConfigPrice = null;

	for (const prices of [config.prices, config.archivedPrices]) {
		if (query.accountType && query.period) {
			output = prices.filter(p => p.accountType === query.accountType).find(p => p.period === query.period);
		} else if (query.priceId) {
			output = prices.find(p => p.id === query.priceId);
		} else {
			throw new Error(`Invalid query: ${JSON.stringify(query)}`);
		}

		if (output) break;
	}

	if (!output) throw new Error(`Not found: ${JSON.stringify(query)}`);

	return output;
}

const features = (): Record<FeatureId, PlanFeature> => {
	const shareNotebookTitle = _('Share a notebook with others');

	return {
		maxItemSize: {
			title: _('Max note or attachment size'),
			basic: true,
			pro: true,
			teams: true,
			basicInfo: _('%d MB per note or attachment', 10),
			proInfo: _('%d MB per note or attachment', 200),
			teamsInfo: _('%d MB per note or attachment', 200),
			basicInfoShort: _('%d MB', 10),
			proInfoShort: _('%d MB', 200),
			teamsInfoShort: _('%d MB', 200),
		},
		maxStorage: {
			title: _('Storage space'),
			basic: true,
			pro: true,
			teams: true,
			basicInfo: _('%d GB storage space', 2),
			proInfo: _('%d GB storage space', 30),
			teamsInfo: _('%d GB storage space', 50),
			basicInfoShort: _('%d GB', 2),
			proInfoShort: _('%d GB', 30),
			teamsInfoShort: _('%d GB', 50),
		},
		publishNote: {
			title: _('Publish notes to the internet'),
			description: 'You can [publish a note](https://joplinapp.org/help/apps/publish_note) from the Joplin app. You will get a link that you can share with other users, who can then view the note in their browser.',
			basic: true,
			pro: true,
			teams: true,
		},
		sync: {
			title: _('Sync as many devices as you want'),
			basic: true,
			pro: true,
			teams: true,
		},
		clipper: {
			title: _('Web Clipper'),
			description: _('The [Web Clipper](%s) is a browser extension that allows you to save web pages and screenshots from your browser.', 'https://joplinapp.org/help/apps/clipper'),
			basic: true,
			pro: true,
			teams: true,
		},
		collaborate: {
			title: _('Collaborate on a notebook with others'),
			description: _('This allows another user to share a notebook with you, and you can then both collaborate on it. It does not however allow you to share a notebook with someone else, unless you have the feature "%s".', shareNotebookTitle),
			basic: true,
			pro: true,
			teams: true,
		},
		share: {
			title: shareNotebookTitle,
			description: 'You can [share a notebook](https://joplinapp.org/help/apps/share_notebook/) with other Joplin Cloud users, who can then view the notes and edit them.',
			basic: false,
			pro: true,
			teams: true,
		},
		emailToNote: {
			title: _('Email to Note'),
			description: '[Email to Note](https://joplinapp.org/help/apps/email_to_note/) allows you to save your emails in Joplin Cloud by forwarding your emails to a special email address. The subject of the email will become the note title, and the email body will become the note content.',
			basic: false,
			pro: true,
			teams: true,
		},
		customBanner: {
			title: _('Customise the note publishing banner'),
			description: 'You can [customise the banner](https://joplinapp.org/help/apps/publish_note#customising-the-publishing-banner) that appears on top of your published notes, for example by adding a custom logo and text, and changing the banner colour.',
			basic: false,
			pro: true,
			teams: true,
		},
		multiUsers: {
			title: _('Manage multiple users'),
			description: 'The [Teams functionality](https://joplinapp.org/help/apps/teams/) enables the efficient administration of multiple users within a team. Serving as a centralized hub, it provides an overview of all users within your organisations, facilitating easy addition or removal of members, as well as centralised billing.',
			basic: false,
			pro: false,
			teams: true,
		},
		consolidatedBilling: {
			title: _('Consolidated billing'),
			description: 'Billing is consolidated, ensuring a single monthly or yearly invoice, based on your chosen plan. The billing is automatically adjusted in accordance with the number of team members',
			basic: false,
			pro: false,
			teams: true,
		},
		sharePermissions: {
			title: _('Share permissions'),
			description: '[Share permissions](https://joplinapp.org/help/apps/share_permissions/) allow you to define whether a notebook you share with someone can be edited or is read-only. It can be useful for example to share documentation that you do not want to be modified.',
			basic: false,
			pro: false,
			teams: true,
		},
		prioritySupport: {
			title: _('Priority support'),
			basic: false,
			pro: false,
			teams: true,
		},
	};
};

export const getFeatureIdsByPlan = (planName: PlanName, featureOn: boolean): FeatureId[] => {
	const output: FeatureId[] = [];

	for (const [k, v] of Object.entries(features())) {
		if (v[planName] === featureOn) {
			output.push(k);
		}
	}

	return output;
};

export const getFeatureLabelsByPlan = (planName: PlanName, featureOn: boolean): string[] => {
	const output: FeatureId[] = [];

	for (const [featureId, v] of Object.entries(features())) {
		if (v[planName] === featureOn) {
			output.push(getFeatureLabel(planName, featureId));
		}
	}

	return output;
};

export const getAllFeatureIds = (): FeatureId[] => {
	return Object.keys(features());
};

export const getFeatureById = (featureId: FeatureId): PlanFeature => {
	return features()[featureId];
};

export const getFeaturesByPlan = (planName: PlanName, featureOn: boolean): PlanFeature[] => {
	const output: PlanFeature[] = [];

	for (const [, v] of Object.entries(features())) {
		if (v[planName] === featureOn) {
			output.push(v);
		}
	}

	return output;
};

export const getFeatureLabel = (planName: PlanName, featureId: FeatureId): string => {
	const feature = features()[featureId];
	const k = `${planName}Info`;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	if ((feature as any)[k]) return (feature as any)[k];
	return feature.title;
};

export const getFeatureEnabled = (planName: PlanName, featureId: FeatureId): boolean => {
	const feature = features()[featureId];
	return feature[planName];
};

export const createFeatureTableMd = () => {
	const headers: MarkdownTableHeader[] = [
		{
			name: 'featureLabel',
			label: 'Feature',
			disableHtmlEscape: true,
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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const infoShort: string = (feature as any)[`${planName}InfoShort`];
		if (infoShort) return infoShort;
		return '✔️';
	};

	const makeFeatureLabel = (featureId: string, feature: PlanFeature) => {
		const output: string[] = [
			`${htmlentities(feature.title)}`,
		];
		if (feature.description) {
			output.push(`<a data-id=${htmlentities(featureId)} class="feature-title" name="feature-${htmlentities(featureId)}" href="#feature-${htmlentities(featureId)}">i</a>`);
			output.push(`<div class="feature-description feature-description-${htmlentities(featureId)}">${htmlentities(feature.description)}</div>`);
		}
		return output.join('');
	};

	for (const [id, feature] of Object.entries(features())) {
		const row: MarkdownTableRow = {
			featureLabel: makeFeatureLabel(id, feature),
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
			title: _('Basic'),
			priceMonthly: findPrice(stripeConfig, {
				accountType: 1,
				period: PricePeriod.Monthly,
			}),
			priceYearly: findPrice(stripeConfig, {
				accountType: 1,
				period: PricePeriod.Yearly,
			}),
			featured: false,
			iconName: 'basic-icon',
			featuresOn: getFeatureIdsByPlan(PlanName.Basic, true),
			featuresOff: getFeatureIdsByPlan(PlanName.Basic, false),
			featureLabelsOn: getFeatureLabelsByPlan(PlanName.Basic, true),
			featureLabelsOff: getFeatureLabelsByPlan(PlanName.Basic, false),
			cfaLabel: _('Try it now'),
			cfaUrl: '',
			footnote: '',
		},

		pro: {
			name: 'pro',
			title: _('Pro'),
			priceMonthly: findPrice(stripeConfig, {
				accountType: 2,
				period: PricePeriod.Monthly,
			}),
			priceYearly: findPrice(stripeConfig, {
				accountType: 2,
				period: PricePeriod.Yearly,
			}),
			featured: true,
			iconName: 'pro-icon',
			featuresOn: getFeatureIdsByPlan(PlanName.Pro, true),
			featuresOff: getFeatureIdsByPlan(PlanName.Pro, false),
			featureLabelsOn: getFeatureLabelsByPlan(PlanName.Pro, true),
			featureLabelsOff: getFeatureLabelsByPlan(PlanName.Pro, false),
			cfaLabel: _('Try it now'),
			cfaUrl: '',
			footnote: '',
		},

		teams: {
			name: 'teams',
			title: _('Teams'),
			priceMonthly: findPrice(stripeConfig, {
				accountType: 3,
				period: PricePeriod.Monthly,
			}),
			priceYearly: findPrice(stripeConfig, {
				accountType: 3,
				period: PricePeriod.Yearly,
			}),
			featured: false,
			iconName: 'business-icon',
			featuresOn: getFeatureIdsByPlan(PlanName.Teams, true),
			featuresOff: getFeatureIdsByPlan(PlanName.Teams, false),
			featureLabelsOn: getFeatureLabelsByPlan(PlanName.Teams, true),
			featureLabelsOff: getFeatureLabelsByPlan(PlanName.Teams, false),
			cfaLabel: _('Try it now'),
			cfaUrl: '',
			footnote: _('Per user. Minimum of %d users.', 2),
		},
	};
}
