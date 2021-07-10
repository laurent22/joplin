export enum Env {
	Dev = 'dev',
	Prod = 'prod',
}

interface GithubSponsor {
	name: string;
	id: string;
}

interface OrgSponsor {
	url: string;
	title: string;
	imageName: string;
}

export interface Sponsors {
	github: GithubSponsor[];
	orgs: OrgSponsor[];
}

interface PressCarouselItem {
	active: string;
	body: string;
	author: string;
	source: string;
	imageName: string;
	url: string;
}

interface PressCarousel {
	id: string;
	items: PressCarouselItem[];
}

interface NavBar {
	isFrontPage: boolean;
}

export interface TemplateParams {
	env?: Env;
	baseUrl?: string;
	pageName?: string;
	imageBaseUrl?: string;
	cssBaseUrl?: string;
	jsBaseUrl?: string;
	tocHtml?: string;
	sourceMarkdownFile?: string;
	title?: string;
	donateLinksMd?: string;
	pageTitle?: string;
	yyyy? : string;
	templateHtml?: string;
	partials?: Record<string, string>;
	forumUrl?: string;
	showToc?: boolean;
	pressCarouselRegular?: PressCarousel;
	pressCarouselMobile?: PressCarousel;
	sponsors?: Sponsors;
	showImproveThisDoc?: boolean;
	contentHtml?: string;
	navbar?: NavBar;
	showJoplinCloudLinks?: boolean;
	buildTime?: number;
}

export interface Plan {
	name: string;
	title: string;
	price: string;
	stripePriceId: string;
	featured: boolean;
	iconName: string;
	featuresOn: string[];
	featuresOff: string[];
	cfaLabel: string;
	cfaUrl: string;
}

export interface PlanPageParams extends TemplateParams {
	plans: Record<string, Plan>;
	faqHtml: string;
	stripeConfig: StripePublicConfig;
}

export interface StripePublicConfig {
	publishableKey: string;
	basicPriceId: string;
	proPriceId: string;
	webhookBaseUrl: string;
}
