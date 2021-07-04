import * as fs from 'fs-extra';
const dirname = require('path').dirname;
const Mustache = require('mustache');
const glob = require('glob');
const MarkdownIt = require('markdown-it');
const path = require('path');

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
}

const rootDir = dirname(dirname(__dirname));
const websiteAssetDir = `${rootDir}/Assets/WebsiteAssets`;
const mainTemplateHtml = fs.readFileSync(`${websiteAssetDir}/templates/main-new.mustache`, 'utf8');

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

			// if (token.type === 'heading_open') {
			// 	insideHeading = true;
			// 	continue;
			// }

			// if (token.type === 'heading_close') {
			// 	insideHeading = false;
			// 	continue;
			// }

			// if (insideHeading && token.type === 'inline') {
			// 	const anchorName = headingTextToAnchorName(token.content, doneNames);
			// 	doneNames.push(anchorName);
			// 	const anchorTokens = createAnchorTokens(anchorName);
			// 	// token.children = anchorTokens.concat(token.children);
			// 	token.children = token.children.concat(anchorTokens);
			// }
		}

	});

	// console.info('iiiiiiiiiiiiiiiiii');

	// markdownIt.renderer.rules.image = function (tokens:any[], idx:number, options:any, env:any, self:any) {
	// 	const defaultRender = markdownIt.renderer.rules.image;
	// 	const token = tokens[idx];

	// 	console.info('AAAAAAAAAAA', tokens);

	// 	return defaultRender(tokens, idx, options, env, self);
	// }

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

	return Mustache.render(mainTemplateHtml, {
		...templateParams,
		contentHtml: markdownIt.render(md),
	});
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

	return matches[1].trim();
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

	templateParams.baseUrl = '';// 'https://joplinapp.org';
	templateParams.imageBaseUrl = `${templateParams.baseUrl}/images`;
	templateParams.cssBaseUrl = `${templateParams.baseUrl}/css`;
	templateParams.jsBaseUrl = `${templateParams.baseUrl}/js`;
	templateParams.tocHtml = tocHtml();
	templateParams.yyyy = (new Date()).getFullYear().toString();

	const title = [];

	if (!templateParams.title) {
		title.push('Joplin - an open source note taking and to-do application with synchronisation capabilities');
	} else {
		title.push(templateParams.title);
		title.push('Joplin');
	}

	md = replaceGitHubByJoplinAppLinks(md);

	if (templateParams.donateLinksMd) {
		md = `${templateParams.donateLinksMd}\n\n* * *\n\n${md}`;
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

async function main() {
	await fs.remove(`${rootDir}/docs`);
	await fs.copy(websiteAssetDir, `${rootDir}/docs`);

	renderMdToHtml(makeHomePageMd(), `${rootDir}/docs/index.html`, { sourceMarkdownFile: 'README.md' });

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
			donateLinksMd: donateLinksMd,
		}]);
	}

	for (const source of sources) {
		source[2].sourceMarkdownFile = source[0];
		source[2].sourceMarkdownName = path.basename(source[0], path.extname(source[0]));
		renderFileToHtml(`${rootDir}/${source[0]}`, `${rootDir}/${source[1]}`, source[2]);
	}
}

main().catch((error) => {
	console.error(error);
});
