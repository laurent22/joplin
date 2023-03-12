import { Plan, StripePublicConfig } from '@joplin/lib/utils/joplinCloud';
import { OpenGraphTags } from './openGraph';

export enum Env {
	Dev = 'dev',
	Prod = 'prod',
}

export interface GithubSponsor {
	name: string;
}

export interface GithubUser {
	id: string;
}

export interface OrgSponsor {
	url: string;
	urlWebsite?: string;
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

export interface AssetUrls {
	css: Record<string, string>;
	js: Record<string, string>;
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
	yyyy?: string;
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
	assetUrls: AssetUrls;
	showBottomLinks?: boolean;
	openGraph: OpenGraphTags;
	isNews?: boolean;
}

export interface PlanPageParams extends TemplateParams {
	plans: Record<string, Plan>;
	faqHtml: string;
	featureListHtml: string;
	stripeConfig: StripePublicConfig;
}

export type Partials = Record<string, string>;
