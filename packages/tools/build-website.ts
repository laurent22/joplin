import * as fs from 'fs-extra';
import { filename } from '@joplin/lib/path-utils';
import * as Mustache from 'mustache';
import { insertContentIntoFile } from './tool-utils';
const dirname = require('path').dirname;
const glob = require('glob');
const MarkdownIt = require('markdown-it');
const path = require('path');

interface PressCarouselItem {
	active: string;
	body: string;
	author: string;
	source: string;
	imageName: string;
}

interface TemplateParams {
	baseUrl?: string;
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
	pressCarouselItems?: PressCarouselItem[];
	forumUrl?: string;
	showToc?: boolean;
}

const rootDir = dirname(dirname(__dirname));
const websiteAssetDir = `${rootDir}/Assets/WebsiteAssets`;
const mainTemplateHtml = fs.readFileSync(`${websiteAssetDir}/templates/main-new.mustache`, 'utf8');
const frontTemplateHtml = fs.readFileSync(`${websiteAssetDir}/templates/front.mustache`, 'utf8');
const partialDir = `${websiteAssetDir}/templates/partials`;

async function loadMustachePartials(partialDir: string) {
	const output: Record<string, string> = {};
	const files = await fs.readdir(partialDir);
	for (const f of files) {
		const name = filename(f);
		const templateContent = await fs.readFile(`${partialDir}/${f}`, 'utf8');
		output[name] = templateContent;
	}
	return output;
}

function markdownToHtml(md: string, templateParams: TemplateParams): string {
	const markdownIt = new MarkdownIt({
		breaks: true,
		linkify: true,
		html: true,
	});

	markdownIt.core.ruler.push('tableClass', (state: any) => {
		const tokens = state.tokens;
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];

			if (token.type === 'table_open') {
				token.attrs = [
					['class', 'table'],
				];
			}
		}
	});

	markdownIt.core.ruler.push('checkbox', (state: any) => {
		const tokens = state.tokens;
		const Token = state.Token;
		const doneNames = [];

		const headingTextToAnchorName = (text: string, doneNames: string[]) => {
			const allowed = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
			let lastWasDash = true;
			let output = '';
			for (let i = 0; i < text.length; i++) {
				const c = text[i];
				if (allowed.indexOf(c) < 0) {
					if (lastWasDash) continue;
					lastWasDash = true;
					output += '-';
				} else {
					lastWasDash = false;
					output += c;
				}
			}

			output = output.toLowerCase();

			while (output.length && output[output.length - 1] === '-') {
				output = output.substr(0, output.length - 1);
			}

			let temp = output;
			let index = 1;
			while (doneNames.indexOf(temp) >= 0) {
				temp = `${output}-${index}`;
				index++;
			}
			output = temp;

			return output;
		};

		const createAnchorTokens = (anchorName: string) => {
			const output = [];

			{
				const token = new Token('heading_anchor_open', 'a', 1);
				token.attrs = [
					['name', anchorName],
					['href', `#${anchorName}`],
					['class', 'heading-anchor'],
				];
				output.push(token);
			}

			{
				const token = new Token('text', '', 0);
				token.content = '🔗';
				output.push(token);
			}

			{
				const token = new Token('heading_anchor_close', 'a', -1);
				output.push(token);
			}

			return output;
		};

		let insideHeading = false;
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];

			if (token.type === 'heading_open') {
				insideHeading = true;
				continue;
			}

			if (token.type === 'heading_close') {
				insideHeading = false;
				continue;
			}

			if (insideHeading && token.type === 'inline') {
				const anchorName = headingTextToAnchorName(token.content, doneNames);
				doneNames.push(anchorName);
				const anchorTokens = createAnchorTokens(anchorName);
				// token.children = anchorTokens.concat(token.children);
				token.children = token.children.concat(anchorTokens);
			}
		}
	});

	return Mustache.render(templateParams.templateHtml, {
		...templateParams,
		contentHtml: markdownIt.render(md),
	}, templateParams.partials);
}

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

function replaceGitHubByJoplinAppLinks(md: string) {
	// let output = md.replace(/https:\/\/github.com\/laurent22\/joplin\/blob\/master\/readme\/(.*?)\/index\.md(#[^\s)]+|)/g, 'https://joplinapp.org/$1');
	return md.replace(/https:\/\/github.com\/laurent22\/joplin\/blob\/dev\/readme\/(.*?)\.md(#[^\s)]+|)/g, 'https://joplinapp.org/$1/$2');
}

function tocHtml() {
	if (tocHtml_) return tocHtml_;
	const markdownIt = new MarkdownIt();
	let md = tocMd();
	md = md.replace(/# Table of contents/, '');
	md = replaceGitHubByJoplinAppLinks(md);
	tocHtml_ = markdownIt.render(md);
	tocHtml_ = `<div>${tocHtml_}</div>`;
	return tocHtml_;
}

function renderMdToHtml(md: string, targetPath: string, templateParams: TemplateParams) {
	// Remove the header because it's going to be added back as HTML
	md = md.replace(/# Joplin\n/, '');

	const baseUrl = '';

	templateParams = {
		baseUrl: baseUrl, // 'https://joplinapp.org',
		imageBaseUrl: `${baseUrl}/images`,
		cssBaseUrl: `${baseUrl}/css`,
		jsBaseUrl: `${baseUrl}/js`,
		tocHtml: tocHtml(),
		yyyy: (new Date()).getFullYear().toString(),
		templateHtml: templateParams.templateHtml ? templateParams.templateHtml : mainTemplateHtml,
		forumUrl: 'https://discourse.joplinapp.org/',
		showToc: true,
		...templateParams,
	};

	const title = [];

	if (!templateParams.title) {
		title.push('Joplin - an open source note taking and to-do application with synchronisation capabilities');
	} else {
		title.push(templateParams.title);
		title.push('Joplin');
	}

	md = replaceGitHubByJoplinAppLinks(md);

	if (templateParams.donateLinksMd) {
		md = `${templateParams.donateLinksMd}\n\n${md}`;
	}

	templateParams.pageTitle = title.join(' | ');
	const html = markdownToHtml(md, templateParams);

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
	return renderMdToHtml(md, targetPath, templateParams);
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
	// const html:string[] = [];
	// for (const [_k, v] of Object.entries(downloadButtonsHtml)) {
	// 	html.push(v);
	// }

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

async function main() {
	await fs.remove(`${rootDir}/docs`);
	await fs.copy(websiteAssetDir, `${rootDir}/docs`);

	const partials = await loadMustachePartials(partialDir);

	const readmeMd = makeHomePageMd();

	const downloadButtonsHtml = await createDownloadButtonsHtml(readmeMd);
	await updateDownloadPage(downloadButtonsHtml);

	renderMdToHtml(readmeMd, `${rootDir}/docs/help/index.html`, { sourceMarkdownFile: 'README.md', partials });

	renderMdToHtml('', `${rootDir}/docs/index.html`, {
		templateHtml: frontTemplateHtml,
		partials,
		pressCarouselItems: [
			{
				active: 'active',
				body: 'It lets you create multiple types of notes, reminders, and alarms, all of which can be synced. The app also includes a web clipper too, but in our opinion, Joplin’s best feature is the built-in end-to-end encryption for keeping your notes private.',
				author: 'Brendan Hesse',
				source: 'Life Hacker, "The Best Note-Taking Apps"',
				imageName: 'in-the-press-life-hacker.png',
			},
			{
				active: '',
				body: 'Joplin is single handedly the best pick for an open-source note-taking app, making it an Editors\' Choice winner for that category. Unlike some open-source tools, which are incredibly difficult to use, Joplin is surprisingly user friendly, even in setting up storage and syncing.',
				author: 'Jill Duffy',
				source: 'PCMag, "The Best Open-Source Note-Taking App"',
				imageName: 'in-the-press-life-pcmag.png',
			},
			{
				active: '',
				body: 'Joplin is an excellent open source note taking application with plenty of features. You can take notes, make to-do list and sync your notes across devices by linking it with cloud services. The synchronization is protected with end to end encryption.',
				author: 'Abhishek Prakash',
				source: 'It\'s FOSS, "Joplin: Open source note organizer"',
				imageName: 'in-the-press-its-foss.png',
			},
		],
	});

	const mdFiles = glob.sync(`${rootDir}/readme/**/*.md`, {
		ignore: [
			// '**/node_modules/**',
		],
	}).map((f: string) => f.substr(rootDir.length + 1));

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
		renderFileToHtml(`${rootDir}/${source[0]}`, `${rootDir}/${source[1]}`, { ...source[2], partials });
	}
}

main().catch((error) => {
	console.error(error);
});
