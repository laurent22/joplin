import { readFileSync, readFile, mkdirpSync, writeFileSync, remove, copy, pathExistsSync } from 'fs-extra';
import { rootDir } from '../tool-utils';
import { pressCarouselItems } from './utils/pressCarousel';
import { getMarkdownIt, loadMustachePartials, markdownToPageHtml, renderMustache } from './utils/render';
import { AssetUrls, Env, OrgSponsor, PlanPageParams, Sponsors, TemplateParams } from './utils/types';
import { getPlans, loadStripeConfig } from '@joplin/lib/utils/joplinCloud';
import { shuffle } from '@joplin/lib/array';
import { stripOffFrontMatter } from './utils/frontMatter';
import { dirname, basename } from 'path';
const moment = require('moment');

const glob = require('glob');
const path = require('path');
const md5File = require('md5-file/promise');

const env = Env.Prod;

const docDir = `${dirname(dirname(dirname(dirname(__dirname))))}/joplin-website/docs`;

if (!pathExistsSync(docDir)) throw new Error(`Doc directory does not exist: ${docDir}`);

const websiteAssetDir = `${rootDir}/Assets/WebsiteAssets`;
const mainTemplateHtml = readFileSync(`${websiteAssetDir}/templates/main-new.mustache`, 'utf8');
const frontTemplateHtml = readFileSync(`${websiteAssetDir}/templates/front.mustache`, 'utf8');
const plansTemplateHtml = readFileSync(`${websiteAssetDir}/templates/plans.mustache`, 'utf8');
const stripeConfig = loadStripeConfig(env, `${rootDir}/packages/server/stripeConfig.json`);
const partialDir = `${websiteAssetDir}/templates/partials`;

const discussLink = 'https://discourse.joplinapp.org/c/news/9';

let tocMd_: string = null;
let tocHtml_: string = null;
const tocRegex_ = /<!-- TOC -->([^]*)<!-- TOC -->/;
function tocMd() {
	if (tocMd_) return tocMd_;
	const md = readFileSync(`${rootDir}/README.md`, 'utf8');
	const toc = md.match(tocRegex_);
	tocMd_ = toc[1];
	return tocMd_;
}

const donateLinksRegex_ = /<!-- DONATELINKS -->([^]*)<!-- DONATELINKS -->/;
async function getDonateLinks() {
	const md = await readFile(`${rootDir}/README.md`, 'utf8');
	const matches = md.match(donateLinksRegex_);

	if (!matches) throw new Error('Cannot fetch donate links');

	return `<div class="donate-links">\n\n${matches[1].trim()}\n\n</div>`;
}

function replaceGitHubByWebsiteLinks(md: string) {
	return md
		.replace(/https:\/\/github.com\/laurent22\/joplin\/blob\/dev\/readme\/(.*?)\.md(#[^\s)]+|)/g, '/$1/$2')
		.replace(/https:\/\/github.com\/laurent22\/joplin\/blob\/dev\/README\.md(#[^\s)]+|)/g, '/help/$1')
		.replace(/https:\/\/raw.githubusercontent.com\/laurent22\/joplin\/dev\/Assets\/WebsiteAssets\/(.*?)/g, '/$1');
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

const baseUrl = '';
const cssBasePath = `${websiteAssetDir}/css`;
const cssBaseUrl = `${baseUrl}/css`;
const jsBasePath = `${websiteAssetDir}/js`;
const jsBaseUrl = `${baseUrl}/js`;

async function getAssetUrls(): Promise<AssetUrls> {
	return {
		css: {
			fontawesome: `${cssBaseUrl}/fontawesome-all.min.css?h=${await md5File(`${cssBasePath}/fontawesome-all.min.css`)}`,
			site: `${cssBaseUrl}/site.css?h=${await md5File(`${cssBasePath}/site.css`)}`,
		},
		js: {
			script: `${jsBaseUrl}/script.js?h=${await md5File(`${jsBasePath}/script.js`)}`,
		},
	};
}

function defaultTemplateParams(assetUrls: AssetUrls): TemplateParams {
	return {
		env,
		baseUrl,
		imageBaseUrl: `${baseUrl}/images`,
		cssBaseUrl,
		jsBaseUrl,
		tocHtml: tocHtml(),
		yyyy: (new Date()).getFullYear().toString(),
		templateHtml: mainTemplateHtml,
		forumUrl: 'https://discourse.joplinapp.org/',
		showToc: true,
		showImproveThisDoc: true,
		showJoplinCloudLinks: true,
		navbar: {
			isFrontPage: false,
		},
		assetUrls,
	};
}

function renderPageToHtml(md: string, targetPath: string, templateParams: TemplateParams) {
	// Remove the header because it's going to be added back as HTML
	md = md.replace(/# Joplin\n/, '');

	templateParams = {
		...defaultTemplateParams(templateParams.assetUrls),
		...templateParams,
	};

	templateParams.showBottomLinks = templateParams.showImproveThisDoc || !!templateParams.discussOnForumLink;

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
	mkdirpSync(folderPath);

	writeFileSync(targetPath, html);
}

async function readmeFileTitle(sourcePath: string) {
	let md = await readFile(sourcePath, 'utf8');
	md = stripOffFrontMatter(md).doc;
	const r = md.match(/(^|\n)# (.*)/);

	if (!r) {
		throw new Error(`Could not determine title for Markdown file: ${sourcePath}`);
	} else {
		return r[2];
	}
}

function renderFileToHtml(sourcePath: string, targetPath: string, templateParams: TemplateParams) {
	let md = readFileSync(sourcePath, 'utf8');
	md = stripOffFrontMatter(md).doc;
	return renderPageToHtml(md, targetPath, templateParams);
}

function makeHomePageMd() {
	let md = readFileSync(`${rootDir}/README.md`, 'utf8');
	md = md.replace(tocRegex_, '');

	// HACK: GitHub needs the \| or the inline code won't be displayed correctly inside the table,
	// while MarkdownIt doesn't and will in fact display the \. So we remove it here.
	md = md.replace(/\\\| bash/g, '| bash');

	return md;
}

async function loadSponsors(): Promise<Sponsors> {
	const sponsorsPath = `${rootDir}/packages/tools/sponsors.json`;
	const output: Sponsors = JSON.parse(await readFile(sponsorsPath, 'utf8'));
	output.orgs = shuffle<OrgSponsor>(output.orgs.map(o => {
		if (o.urlWebsite) o.url = o.urlWebsite;
		return o;
	}));

	return output;
}

const makeNewsFrontPage = async (sourceFilePaths: string[], targetFilePath: string, templateParams: TemplateParams) => {
	const maxNewsPerPage = 20;

	const frontPageMd: string[] = [];

	for (const mdFilePath of sourceFilePaths) {
		let md = await readFile(mdFilePath, 'utf8');
		const info = stripOffFrontMatter(md);
		md = info.doc.trim();
		const dateString = moment(info.created).format('D MMM YYYY');
		md = md.replace(/^# (.*)/, `# [$1](https://github.com/laurent22/joplin/blob/dev/readme/news/${path.basename(mdFilePath)})\n\n*Published on **${dateString}***\n\n`);
		md += `\n\n* * *\n\n[<i class="fab fa-discourse"></i> Discuss on the forum](${discussLink})`;
		frontPageMd.push(md);
		if (frontPageMd.length >= maxNewsPerPage) break;
	}

	renderPageToHtml(frontPageMd.join('\n\n* * *\n\n'), targetFilePath, templateParams);
};

const isNewsFile = (filePath: string): boolean => {
	return filePath.includes('readme/news/');
};

async function main() {
	await remove(`${docDir}`);
	await copy(websiteAssetDir, `${docDir}`);

	const sponsors = await loadSponsors();
	const partials = await loadMustachePartials(partialDir);
	const assetUrls = await getAssetUrls();

	const readmeMd = makeHomePageMd();

	// await updateDownloadPage(readmeMd);

	// =============================================================
	// HELP PAGE
	// =============================================================

	renderPageToHtml(readmeMd, `${docDir}/help/index.html`, { sourceMarkdownFile: 'README.md', partials, sponsors, assetUrls });

	// =============================================================
	// FRONT PAGE
	// =============================================================

	renderPageToHtml('', `${docDir}/index.html`, {
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
		assetUrls,
	});

	// =============================================================
	// PLANS PAGE
	// =============================================================

	const planPageFaqMd = await readFile(`${rootDir}/readme/faq_joplin_cloud.md`, 'utf8');
	const planPageFaqHtml = getMarkdownIt().render(planPageFaqMd, {});

	const planPageParams: PlanPageParams = {
		...defaultTemplateParams(assetUrls),
		partials,
		templateHtml: plansTemplateHtml,
		plans: getPlans(stripeConfig),
		faqHtml: planPageFaqHtml,
		stripeConfig,
	};

	const planPageContentHtml = renderMustache('', planPageParams);

	renderPageToHtml('', `${docDir}/plans/index.html`, {
		...defaultTemplateParams(assetUrls),
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

	const makeTargetFilePath = (input: string): string => {
		const filenameNoExt = basename(input, '.md');

		if (isNewsFile(input)) {
			return `${docDir}/news/${filenameNoExt}/index.html`; // `${input.replace(/\.md/, '').replace(/readme\/news\//, 'docs/news/')}/index.html`;
		} else {
			return `${docDir}/${filenameNoExt}/index.html`;
		}
	};

	const newsFilePaths: string[] = [];

	for (const mdFile of mdFiles) {
		const title = await readmeFileTitle(`${rootDir}/${mdFile}`);
		const targetFilePath = makeTargetFilePath(mdFile);

		const isNews = isNewsFile(mdFile);
		if (isNews) newsFilePaths.push(mdFile);

		sources.push([mdFile, targetFilePath, {
			title: title,
			donateLinksMd: mdFile === 'readme/donate.md' ? '' : donateLinksMd,
			showToc: mdFile !== 'readme/download.md' && !isNews,
		}]);
	}

	for (const source of sources) {
		source[2].sourceMarkdownFile = source[0];
		source[2].sourceMarkdownName = path.basename(source[0], path.extname(source[0]));

		const sourceFilePath = `${rootDir}/${source[0]}`;
		const targetFilePath = source[1];
		const isNews = isNewsFile(sourceFilePath);

		renderFileToHtml(sourceFilePath, targetFilePath, {
			...source[2],
			templateHtml: mainTemplateHtml,
			pageName: isNews ? 'news-item' : '',
			discussOnForumLink: isNews ? discussLink : '',
			showImproveThisDoc: !isNews,
			partials,
			assetUrls,
		});
	}

	newsFilePaths.sort((a, b) => {
		return a.toLowerCase() > b.toLowerCase() ? -1 : +1;
	});

	await makeNewsFrontPage(newsFilePaths, `${docDir}/news/index.html`, {
		...defaultTemplateParams(assetUrls),
		pageName: 'news',
		partials,
		showToc: false,
		showImproveThisDoc: false,
		donateLinksMd,
	});
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
