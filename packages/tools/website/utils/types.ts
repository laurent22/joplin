import { Plan, StripePublicConfig } from '@joplin/lib/utils/joplinCloud';
import { Sponsors } from '../../utils/loadSponsors';
import { OpenGraphTags } from './openGraph';

export enum Env {
	Dev = 'dev',
	Prod = 'prod',
}

export interface Locale {
	htmlTranslations: Record<string, string>;
	lang: string;
	pathPrefix: string;
}

export interface GithubUser {
	id: string;
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
	locale?: Locale;
}

export interface PlanPageParams extends TemplateParams {
	plans: Record<string, Plan>;
	faqHtml: string;
	featureListHtml: string;
	stripeConfig: StripePublicConfig;
}

export type Partials = Record<string, string>;
