import * as fs from 'fs-extra';
import { insertContentIntoFile, rootDir } from '../tool-utils';
import { getPlans } from './utils/plans';
import { pressCarouselItems } from './utils/pressCarousel';
import { getMarkdownIt, loadMustachePartials, markdownToPageHtml, renderMustache } from './utils/render';
import { Env, PlanPageParams, Sponsors, StripePublicConfig, TemplateParams } from './utils/types';
const dirname = require('path').dirname;
const glob = require('glob');
const path = require('path');

const env = Env.Prod;
const buildTime = Date.now();

const websiteAssetDir = `${rootDir}/Assets/WebsiteAssets`;
const mainTemplateHtml = fs.readFileSync(`${websiteAssetDir}/templates/main-new.mustache`, 'utf8');
const frontTemplateHtml = fs.readFileSync(`${websiteAssetDir}/templates/front.mustache`, 'utf8');
const plansTemplateHtml = fs.readFileSync(`${websiteAssetDir}/templates/plans.mustache`, 'utf8');
const stripeConfigs: Record<Env, StripePublicConfig> = JSON.parse(fs.readFileSync(`${rootDir}/packages/server/stripeConfig.json`, 'utf8'));
const partialDir = `${websiteAssetDir}/templates/partials`;

const stripeConfig = stripeConfigs[env];

let tocMd_: string = null;
let tocHtml_: string = null;
const tocRegex_ = /<!-- TOC -->([^]*)<!-- TOC -->/;
function tocMd() {
	if (tocMd_) return tocMd_;
	const md = fs.readFileSync(`${rootDir}/README.md`, 'utf8');
	const toc = md.match(tocRegex_);
	tocMd_ = toc[1];
	return tocMd_;
}

const donateLinksRegex_ = /<!-- DONATELINKS -->([^]*)<!-- DONATELINKS -->/;
async function getDonateLinks() {
	const md = await fs.readFile(`${rootDir}/README.md`, 'utf8');
	const matches = md.match(donateLinksRegex_);

	if (!matches) throw new Error('Cannot fetch donate links');

	return `<div class="donate-links">\n\n${matches[1].trim()}\n\n</div>`;
}

function replaceGitHubByWebsiteLinks(md: string) {
	// let output = md.replace(/https:\/\/github.com\/laurent22\/joplin\/blob\/master\/readme\/(.*?)\/index\.md(#[^\s)]+|)/g, 'https://joplinapp.org/$1');
	return md
		.replace(/https:\/\/github.com\/laurent22\/joplin\/blob\/dev\/readme\/(.*?)\.md(#[^\s)]+|)/g, '/$1/$2')
		.replace(/https:\/\/github.com\/laurent22\/joplin\/blob\/dev\/README\.md(#[^\s)]+|)/g, '/help/$1');
}

function tocHtml() {
	if (tocHtml_) return tocHtml_;
	const markdownIt = getMarkdownIt();
	let md = tocMd();
	md = md.replace(/# Table of contents/, '');
	md = replaceGitHubByWebsiteLinks(md);
	tocHtml_ = markdownIt.render(md);
	tocHtml_ = `<div>${tocHtml_}</div>`;
	return tocHtml_;
}

function defaultTemplateParams(): TemplateParams {
	const baseUrl = '';

	return {
		env,
		baseUrl: baseUrl,
		imageBaseUrl: `${baseUrl}/images`,
		cssBaseUrl: `${baseUrl}/css`,
		jsBaseUrl: `${baseUrl}/js`,
		tocHtml: tocHtml(),
		yyyy: (new Date()).getFullYear().toString(),
		templateHtml: mainTemplateHtml,
		forumUrl: 'https://discourse.joplinapp.org/',
		showToc: true,
		showImproveThisDoc: true,
		showJoplinCloudLinks: false,
		navbar: {
			isFrontPage: false,
		},
		buildTime,
	};
}

function renderPageToHtml(md: string, targetPath: string, templateParams: TemplateParams) {
	// Remove the header because it's going to be added back as HTML
	md = md.replace(/# Joplin\n/, '');

	templateParams = {
		...defaultTemplateParams(),
		...templateParams,
	};

	const title = [];

	if (!templateParams.title) {
		title.push('Joplin - an open source note taking and to-do application with synchronisation capabilities');
	} else {
		title.push(templateParams.title);
		title.push('Joplin');
	}

	md = replaceGitHubByWebsiteLinks(md);

	if (templateParams.donateLinksMd) {
		md = `${templateParams.donateLinksMd}\n\n${md}`;
	}

	templateParams.pageTitle = title.join(' | ');
	const html = templateParams.contentHtml ? renderMustache(templateParams.contentHtml, templateParams) : markdownToPageHtml(md, templateParams);

	const folderPath = dirname(targetPath);
	fs.mkdirpSync(folderPath);

	fs.writeFileSync(targetPath, html);
}

async function readmeFileTitle(sourcePath: string) {
	const md = await fs.readFile(sourcePath, 'utf8');
	const r = md.match(/(^|\n)# (.*)/);

	if (!r) {
		throw new Error(`Could not determine title for Markdown file: ${sourcePath}`);
	} else {
		return r[2];
	}
}

function renderFileToHtml(sourcePath: string, targetPath: string, templateParams: TemplateParams) {
	const md = fs.readFileSync(sourcePath, 'utf8');
	return renderPageToHtml(md, targetPath, templateParams);
}

function makeHomePageMd() {
	let md = fs.readFileSync(`${rootDir}/README.md`, 'utf8');
	md = md.replace(tocRegex_, '');

	// HACK: GitHub needs the \| or the inline code won't be displayed correctly inside the table,
	// while MarkdownIt doesn't and will in fact display the \. So we remove it here.
	md = md.replace(/\\\| bash/g, '| bash');

	return md;
}

async function createDownloadButtonsHtml(readmeMd: string): Promise<Record<string, string>> {
	const output: Record<string, string> = {};
	output['windows'] = readmeMd.match(/(<a href=.*?Joplin-Setup-.*?<\/a>)/)[0];
	output['macOs'] = readmeMd.match(/(<a href=.*?Joplin-.*\.dmg.*?<\/a>)/)[0];
	output['linux'] = readmeMd.match(/(<a href=.*?Joplin-.*\.AppImage.*?<\/a>)/)[0];
	output['android'] = readmeMd.match(/(<a href='https:\/\/play.google.com\/store\/apps\/details\?id=net\.cozic\.joplin.*?<\/a>)/)[0];
	output['ios'] = readmeMd.match(/(<a href='https:\/\/itunes\.apple\.com\/us\/app\/joplin\/id1315599797.*?<\/a>)/)[0];

	for (const [k, v] of Object.entries(output)) {
		if (!v) throw new Error(`Could not get download element for: ${k}`);
	}

	return output;

	// <a href='https://github.com/laurent22/joplin/releases/download/v2.1.8/Joplin-Setup-2.1.8.exe'><img alt='Get it on Windows' width="134px" src='https://joplinapp.org/images/BadgeWindows.png'/></a>
	// <a href='https://github.com/laurent22/joplin/releases/download/v2.1.8/Joplin-2.1.8.dmg'><img alt='Get it on macOS' width="134px" src='https://joplinapp.org/images/BadgeMacOS.png'/></a>
	// <a href='https://github.com/laurent22/joplin/releases/download/v2.1.8/Joplin-2.1.8.AppImage'><img alt='Get it on Linux' width="134px" src='https://joplinapp.org/images/BadgeLinux.png'/></a>

	// <a href='https://play.google.com/store/apps/details?id=net.cozic.joplin&utm_source=GitHub&utm_campaign=README&pcampaignid=MKT-Other-global-all-co-prtnr-py-PartBadge-Mar2515-1'><img alt='Get it on Google Play' height="40px" src='https://joplinapp.org/images/BadgeAndroid.png'/></a>
	// <a href='https://itunes.apple.com/us/app/joplin/id1315599797'><img alt='Get it on the App Store' height="40px" src='https://joplinapp.org/images/BadgeIOS.png'/></a>
}

async function updateDownloadPage(downloadButtonsHtml: Record<string, string>) {
	const desktopButtonsHtml = [
		downloadButtonsHtml['windows'],
		downloadButtonsHtml['macOs'],
		downloadButtonsHtml['linux'],
	];

	const mobileButtonsHtml = [
		downloadButtonsHtml['android'],
		downloadButtonsHtml['ios'],
	];

	await insertContentIntoFile(`${rootDir}/readme/download.md`, '<!-- DESKTOP-DOWNLOAD-LINKS -->', '<!-- DESKTOP-DOWNLOAD-LINKS -->', desktopButtonsHtml.join(' '));
	await insertContentIntoFile(`${rootDir}/readme/download.md`, '<!-- MOBILE-DOWNLOAD-LINKS -->', '<!-- MOBILE-DOWNLOAD-LINKS -->', mobileButtonsHtml.join(' '));
}

async function loadSponsors(): Promise<Sponsors> {
	const sponsorsPath = `${rootDir}/packages/tools/sponsors.json`;
	return JSON.parse(await fs.readFile(sponsorsPath, 'utf8'));
}

async function main() {
	await fs.remove(`${rootDir}/docs`);
	await fs.copy(websiteAssetDir, `${rootDir}/docs`);

	const sponsors = await loadSponsors();
	const partials = await loadMustachePartials(partialDir);

	const readmeMd = makeHomePageMd();

	const downloadButtonsHtml = await createDownloadButtonsHtml(readmeMd);
	await updateDownloadPage(downloadButtonsHtml);

	// =============================================================
	// HELP PAGE
	// =============================================================

	renderPageToHtml(readmeMd, `${rootDir}/docs/help/index.html`, { sourceMarkdownFile: 'README.md', partials, sponsors });

	// =============================================================
	// FRONT PAGE
	// =============================================================

	renderPageToHtml('', `${rootDir}/docs/index.html`, {
		templateHtml: frontTemplateHtml,
		partials,
		pressCarouselRegular: {
			id: 'carouselRegular',
			items: pressCarouselItems(),
		},
		pressCarouselMobile: {
			id: 'carouselMobile',
			items: pressCarouselItems(),
		},
		sponsors,
		navbar: {
			isFrontPage: true,
		},
		showToc: false,
	});

	// =============================================================
	// PLANS PAGE
	// =============================================================

	const planPageFaqMd = await fs.readFile(`${rootDir}/readme/faq_joplin_cloud.md`, 'utf8');
	const planPageFaqHtml = getMarkdownIt().render(planPageFaqMd, {});

	const planPageParams: PlanPageParams = {
		...defaultTemplateParams(),
		partials,
		templateHtml: plansTemplateHtml,
		plans: getPlans(stripeConfig),
		faqHtml: planPageFaqHtml,
		stripeConfig,
	};

	const planPageContentHtml = renderMustache('', planPageParams);

	renderPageToHtml('', `${rootDir}/docs/plans/index.html`, {
		...defaultTemplateParams(),
		pageName: 'plans',
		partials,
		showToc: false,
		showImproveThisDoc: false,
		contentHtml: planPageContentHtml,
		title: 'Joplin Cloud Plans',
	});

	// =============================================================
	// All other pages are generated dynamically from the
	// Markdown files under /readme
	// =============================================================

	const mdFiles = glob.sync(`${rootDir}/readme/**/*.md`).map((f: string) => f.substr(rootDir.length + 1));
	const sources = [];
	const donateLinksMd = await getDonateLinks();

	for (const mdFile of mdFiles) {
		const title = await readmeFileTitle(`${rootDir}/${mdFile}`);
		const targetFilePath = `${mdFile.replace(/\.md/, '').replace(/readme\//, 'docs/')}/index.html`;
		sources.push([mdFile, targetFilePath, {
			title: title,
			donateLinksMd: mdFile === 'readme/donate.md' ? '' : donateLinksMd,
			showToc: mdFile !== 'readme/download.md',
		}]);
	}

	for (const source of sources) {
		source[2].sourceMarkdownFile = source[0];
		source[2].sourceMarkdownName = path.basename(source[0], path.extname(source[0]));
		renderFileToHtml(`${rootDir}/${source[0]}`, `${rootDir}/${source[1]}`, {
			...source[2],
			templateHtml: mainTemplateHtml,
			partials,
		});
	}
}

main().catch((error) => {
	console.error(error);
});
