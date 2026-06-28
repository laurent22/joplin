import * as fs from 'fs-extra';
import markdownUtils, { MarkdownTableHeader, MarkdownTableRow } from '../../markdownUtils';
import { _ } from '../../locale';
import { htmlentities } from '@joplin/utils/html';

type FeatureId = string;

export enum PlanName {
	Basic = 'basic',
	Pro = 'pro',
	Pro100Gb = 'pro100Gb',
	Teams = 'teams',
	JoplinServerBusiness = 'joplinServerBusiness',
}

interface PlanFeature {
	title: string;
	description?: string;
	basic: boolean;
	pro: boolean;
	pro100Gb: boolean;
	teams: boolean;
	joplinServerBusiness?: boolean;
	basicInfo?: string;
	proInfo?: string;
	pro100GbInfo?: string;
	teamsInfo?: string;
	joplinServerBusinessInfo?: string;
	basicInfoShort?: string;
	proInfoShort?: string;
	pro100GbInfoShort?: string;
	teamsInfoShort?: string;
	joplinServerBusinessInfoShort?: string;
}

enum PlanHostingType {
	Managed = 'managed',
	Self = 'self',
}

export interface PlanTieredPricingTableRow {
	condition: string;
	priceYearly: string;
}

export interface Plan {
	name: string;
	title: string;
	priceMonthly?: StripePublicConfigPrice;
	priceYearly?: StripePublicConfigPrice;
	pricingTable?: { rows: PlanTieredPricingTableRow[] };
	featured: boolean;
	iconName: string;
	featuresOn: FeatureId[];
	featuresOff: FeatureId[];
	featureLabelsOn: FeatureRow[];
	featureLabelsOff: FeatureRow[];
	cfaLabel: string;
	cfaUrl: string;
	footnote: string;
	learnMoreUrl?: string;
	hostingType: PlanHostingType;
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


export enum ProductType {
	Subscription = 'subscription',
	AiCredits = 'ai-credits',
}

export enum AccountType {
	Default = 0,
	Basic = 1,
	Pro = 2,
	Team = 3,
	Pro100Gb = 4,
	SelfHosted = 5,
}

interface StripeBasePrice {
	id: string;
	currency: PriceCurrency;
}

interface StripeBaseSubscriptionPrice extends StripeBasePrice {
	accountType: AccountType;
	period: PricePeriod;
	productType: ProductType.Subscription|undefined;
	aiCredits?: undefined;
}

export interface StripeFixedSubscriptionPrice extends StripeBaseSubscriptionPrice {
	amount: string;
	formattedAmount: string;
	formattedMonthlyAmount: string;
	amounts: undefined;
}

export interface StripeTieredAmount {
	amount: string;
	formattedAmount: string;
	users: [number, number|'infinity'];
	userRange: { min: number; max: number };
}

export interface StripeTieredSubscriptionPrice extends StripeBaseSubscriptionPrice {
	amounts: StripeTieredAmount[];

	quantityMinimum: number;
	amount: undefined;
	formattedAmount: undefined;
	formattedMonthlyAmount: undefined;
}

type StripeSubscriptionPrice = StripeTieredSubscriptionPrice | StripeFixedSubscriptionPrice;

export interface StripePublicConfigAiProductPrice extends StripeBasePrice {
	productType: ProductType.AiCredits;
	amount: string;
	formattedAmount: string;
	aiCredits: number;

	accountType?: undefined;
	period?: undefined;
}

export type StripePublicConfigPrice = StripeSubscriptionPrice | StripePublicConfigAiProductPrice;

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

export const isTieredPrice = (p: StripePublicConfigPrice): p is StripeTieredSubscriptionPrice => {
	return 'amounts' in p;
};

export function loadStripeConfig(env: string, filePath: string): StripePublicConfig {
	const config: StripePublicConfig = JSON.parse(fs.readFileSync(filePath, 'utf8'))[env];
	if (!config) throw new Error(`Invalid env: ${env}`);

	const isSubscriptionPrice = (p: StripePublicConfigPrice): p is StripeSubscriptionPrice => {
		return p.productType === undefined || p.productType === ProductType.Subscription;
	};

	const decoratePrices = (p: StripePublicConfigPrice) => {
		const price = p;
		if (isTieredPrice(p)) {
			return {
				...p,
				amounts: p.amounts.map(amount => ({
					...amount,
					formattedAmount: formatPrice(amount.amount, p.currency),
					userRange: {
						min: amount.users[0],
						max: amount.users[1] === 'infinity' ? Number.POSITIVE_INFINITY : amount.users[1],
					},
				})),
			};
		}
		if (isSubscriptionPrice(p)) {
			return {
				...p,
				productType: ProductType.Subscription,
				formattedAmount: formatPrice(p.amount, p.currency),
				formattedMonthlyAmount: p.period === PricePeriod.Monthly ? formatPrice(p.amount, p.currency) : formatPrice(Number(p.amount) / 12, p.currency),
			} satisfies StripeSubscriptionPrice;
		}
		if (p.productType === ProductType.AiCredits) {
			return {
				...p,
				formattedAmount: formatPrice(p.amount, p.currency),
			} satisfies StripePublicConfigAiProductPrice;
		}

		const exhaustivenessCheck: never = p;
		// Use the exhaustivenessCheck to prevent unused variable warnings
		throw new Error(`Unexpected product type: ${exhaustivenessCheck && price.productType}`);
	};

	config.prices = config.prices.map(decoratePrices);
	config.archivedPrices = config.archivedPrices.map(decoratePrices);

	return config;
}


type FindPriceQuery = {
	accountType?: number;
	period?: PricePeriod;

	priceId?: undefined;
}|{
	accountType?: undefined;
	period?: undefined;

	priceId?: string;
}|{
	accountType?: undefined;
	period?: undefined;
	priceId?: undefined;

	productType: ProductType;
};

export function findPrice(config: StripePublicConfig, query: FindPriceQuery): StripePublicConfigPrice {
	let output: StripePublicConfigPrice = null;

	for (const prices of [config.prices, config.archivedPrices]) {
		if (query.accountType && query.period) {
			output = prices.filter(p => p.accountType === query.accountType).find(p => p.period === query.period);
		} else if (query.priceId) {
			output = prices.find(p => p.id === query.priceId);
		} else if ('productType' in query) {
			output = prices.find(p => p.productType === query.productType);
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
			pro100Gb: true,
			teams: true,
			basicInfo: _('%d MB per note or attachment', 10),
			proInfo: _('%d MB per note or attachment', 200),
			pro100GbInfo: _('%d MB per note or attachment', 200),
			teamsInfo: _('%d MB per note or attachment', 200),
			basicInfoShort: _('%d MB', 10),
			proInfoShort: _('%d MB', 200),
			pro100GbInfoShort: _('%d MB', 200),
			teamsInfoShort: _('%d MB', 200),
		},
		maxStorage: {
			title: _('Storage space'),
			basic: true,
			pro: true,
			pro100Gb: true,
			teams: true,
			basicInfo: _('%d GB storage space', 2),
			proInfo: _('%d GB storage space', 30),
			pro100GbInfo: _('%d GB storage space', 100),
			teamsInfo: _('%d GB storage space', 50),
			basicInfoShort: _('%d GB', 2),
			proInfoShort: _('%d GB', 30),
			pro100GbInfoShort: _('%d GB', 100),
			teamsInfoShort: _('%d GB', 50),
		},
		publishNote: {
			title: _('Publish notes to the internet'),
			description: 'You can [publish a note](https://joplinapp.org/help/apps/publish_note) from the Joplin app. You will get a link that you can share with other users, who can then view the note in their browser.',
			basic: true,
			pro: true,
			pro100Gb: true,
			teams: true,
			joplinServerBusiness: true,
		},
		sync: {
			title: _('Sync as many devices as you want'),
			basic: true,
			pro: true,
			pro100Gb: true,
			teams: true,
			joplinServerBusiness: true,
		},
		// clipper: {
		// 	title: _('Web Clipper'),
		// 	description: _('The [Web Clipper](%s) is a browser extension that allows you to save web pages and screenshots from your browser.', 'https://joplinapp.org/help/apps/clipper'),
		// 	basic: false,
		// 	pro: false,
		// 	teams: false,
		// },
		webApp: {
			title: _('Joplin Web App'),
			description: _('Access your notes from any web browser at %s.', 'https://app.joplincloud.com'),
			basic: true,
			pro: true,
			pro100Gb: true,
			teams: true,
			joplinServerBusiness: false,
		},
		collaborate: {
			title: _('Collaborate on a notebook with others'),
			description: _('This allows another user to share a notebook with you, and you can then both collaborate on it. It does not however allow you to share a notebook with someone else, unless you have the feature "%s".', shareNotebookTitle),
			basic: true,
			pro: true,
			pro100Gb: true,
			teams: true,
			joplinServerBusiness: true,
		},
		share: {
			title: shareNotebookTitle,
			description: 'You can [share a notebook](https://joplinapp.org/help/apps/share_notebook/) with other Joplin Cloud users, who can then view the notes and edit them.',
			basic: false,
			pro: true,
			pro100Gb: true,
			teams: true,
			joplinServerBusiness: true,
		},
		emailToNote: {
			title: _('Email to Note'),
			description: '[Email to Note](https://joplinapp.org/help/apps/email_to_note/) allows you to save your emails in Joplin Cloud by forwarding your emails to a special email address. The subject of the email will become the note title, and the email body will become the note content.',
			basic: false,
			pro: true,
			pro100Gb: true,
			teams: true,
			joplinServerBusiness: true,
		},
		customBanner: {
			title: _('Customise the note publishing banner'),
			description: 'You can [customise the banner](https://joplinapp.org/help/apps/publish_note#customising-the-publishing-banner) that appears on top of your published notes, for example by adding a custom logo and text, and changing the banner colour.',
			basic: false,
			pro: true,
			pro100Gb: true,
			teams: true,
			joplinServerBusiness: true,
		},
		multiUsers: {
			title: _('Manage multiple users'),
			description: 'The [Teams functionality](https://joplinapp.org/help/apps/teams/) enables the efficient administration of multiple users within a team. Serving as a centralized hub, it provides an overview of all users within your organisations, facilitating easy addition or removal of members, as well as centralised billing.',
			basic: false,
			pro: false,
			pro100Gb: false,
			teams: true,
			joplinServerBusiness: true,
		},
		consolidatedBilling: {
			title: _('Consolidated billing'),
			description: 'Billing is consolidated, ensuring a single monthly or yearly invoice, based on your chosen plan. The billing is automatically adjusted in accordance with the number of team members',
			basic: false,
			pro: false,
			pro100Gb: false,
			teams: true,
		},
		sharePermissions: {
			title: _('Share permissions'),
			description: '[Share permissions](https://joplinapp.org/help/apps/share_permissions/) allow you to define whether a notebook you share with someone can be edited or is read-only. It can be useful for example to share documentation that you do not want to be modified.',
			basic: false,
			pro: false,
			pro100Gb: false,
			teams: true,
			joplinServerBusiness: true,
		},
		prioritySupport: {
			title: _('Priority support'),
			basic: false,
			pro: false,
			pro100Gb: false,
			teams: true,
			joplinServerBusiness: true,
		},
		selfHosted: {
			title: _('Self-hosted'),
			basic: false,
			pro: false,
			pro100Gb: false,
			teams: false,
			joplinServerBusiness: true,
		},
		sourceCodeAvailable: {
			title: _('Source code available'),
			basic: false,
			pro: false,
			pro100Gb: false,
			teams: false,
			joplinServerBusiness: true,
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

export interface FeatureAction {
	label: string;
	actionId: string;
}

export interface FeatureRow {
	label: string;
	actions: FeatureAction[];
}

const getFeatureActions = (planName: PlanName, featureId: FeatureId, featureEnabled: boolean) => {
	const result: FeatureAction[] = [];

	if (featureId === 'maxStorage' && featureEnabled) {
		if (planName === PlanName.Pro) {
			result.push({
				label: _('Upgrade to 100 GB'),
				actionId: 'toggleIncreaseStorage',
			});
		} else if (planName === PlanName.Pro100Gb) {
			const defaultPlan = features().maxStorage.proInfoShort;
			result.push({
				label: _('Back to %s', defaultPlan),
				actionId: 'toggleIncreaseStorage',
			});
		}
	}

	return result;
};

export const getFeatureLabelsByPlan = (planName: PlanName, featureOn: boolean): FeatureRow[] => {
	const output: FeatureRow[] = [];

	for (const [featureId, v] of Object.entries(features())) {
		if (v[planName] === featureOn) {
			const actions = getFeatureActions(planName, featureId, featureOn);
			output.push({
				label: getFeatureLabel(planName, featureId),
				actions,
			});
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
	const k = `${planName}Info` as keyof PlanFeature;
	const value = feature[k];
	if (typeof value === 'string' && value) return value;
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
			name: 'pro100Gb',
			label: 'Pro 100 GB',
		},
		{
			name: 'teams',
			label: 'Teams',
		},
		{
			name: 'joplinServerBusiness',
			label: 'Joplin Server Business',
			labelUrl: 'https://joplinapp.org/help/apps/joplin_server_business',
		},
	];

	const rows: MarkdownTableRow[] = [];

	const getCellInfo = (planName: PlanName, featureId: string, feature: PlanFeature) => {
		if (planName === PlanName.JoplinServerBusiness) {
			if (['maxItemSize', 'maxStorage'].includes(featureId)) return '∞';
		}

		if (!feature[planName]) return '-';
		const key = `${planName}InfoShort` as keyof PlanFeature;
		const infoShort = feature[key];
		if (typeof infoShort === 'string' && infoShort) return infoShort;
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
			basic: getCellInfo(PlanName.Basic, id, feature),
			pro: getCellInfo(PlanName.Pro, id, feature),
			pro100Gb: getCellInfo(PlanName.Pro100Gb, id, feature),
			teams: getCellInfo(PlanName.Teams, id, feature),
			joplinServerBusiness: getCellInfo(PlanName.JoplinServerBusiness, id, feature),
		};

		rows.push(row);
	}

	return markdownUtils.createMarkdownTable(headers, rows);
};

const getTieredPricingTable = (price: StripePublicConfigPrice) => {
	if (!isTieredPrice(price)) throw new Error(`Not a tiered price: ${price.id}`);

	const rows: PlanTieredPricingTableRow[] = [];
	for (const amount of price.amounts) {
		const formatUserCount = (count: number) => {
			if (count === Number.POSITIVE_INFINITY) {
				return '∞';
			}
			return String(count);
		};
		rows.push({
			condition: `${
				formatUserCount(amount.userRange.min)
			}—${
				formatUserCount(amount.userRange.max)
			} users`,
			priceYearly: `${amount.formattedAmount} / user / year`,
		});
	}
	return rows;
};

export function getPlans(stripeConfig: StripePublicConfig): Record<PlanName, Plan> {
	// TODO: Set to true to enable self-hosting self-service.
	const selfServiceSelfHostingEnabled = false;
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
			hostingType: PlanHostingType.Managed,
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
			hostingType: PlanHostingType.Managed,
		},

		pro100Gb: {
			name: 'pro100Gb',
			title: _('Pro 100 GB'),
			priceMonthly: findPrice(stripeConfig, {
				accountType: 4,
				period: PricePeriod.Monthly,
			}),
			priceYearly: findPrice(stripeConfig, {
				accountType: 4,
				period: PricePeriod.Yearly,
			}),
			featured: true,
			iconName: 'pro-icon',
			featuresOn: getFeatureIdsByPlan(PlanName.Pro100Gb, true),
			featuresOff: getFeatureIdsByPlan(PlanName.Pro100Gb, false),
			featureLabelsOn: getFeatureLabelsByPlan(PlanName.Pro100Gb, true),
			featureLabelsOff: getFeatureLabelsByPlan(PlanName.Pro100Gb, false),
			cfaLabel: _('Try it now'),
			cfaUrl: '',
			footnote: '',
			hostingType: PlanHostingType.Managed,
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
			footnote: _('Per user. Minimum of 2 users.'),
			hostingType: PlanHostingType.Managed,
		},

		joplinServerBusiness: {
			name: 'joplinServerBusiness',
			title: _('Joplin Server Business'),
			featured: false,
			iconName: 'business-icon',
			featuresOn: getFeatureIdsByPlan(PlanName.JoplinServerBusiness, true),
			// JSB has its own separate page and the features that are "missing" (eg. the web app)
			// are not relevant.
			featuresOff: [],
			featureLabelsOn: getFeatureLabelsByPlan(PlanName.JoplinServerBusiness, true),
			featureLabelsOff: [],
			...(selfServiceSelfHostingEnabled ? {
				pricingTable: {
					rows: getTieredPricingTable(findPrice(stripeConfig, {
						accountType: 5,
						period: PricePeriod.Yearly,
					})),
				},
				cfaLabel: _('Try it now'),
				cfaUrl: '',
				priceYearly: findPrice(stripeConfig, {
					accountType: 5,
					period: PricePeriod.Yearly,
				}),
			} : {
				cfaLabel: _('Get a quote'),
				cfaUrl: 'https://tally.so/r/D4BlOE',
			}),
			footnote: '',
			learnMoreUrl: 'https://joplinapp.org/help/apps/joplin_server_business',
			hostingType: PlanHostingType.Self,
		},
	};
}
