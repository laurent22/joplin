/* eslint-disable import/prefer-default-export */

import { execCommand, getRootDir } from '@joplin/utils';
import { readFile, readdir, stat, writeFile } from 'fs/promises';
import * as MarkdownIt from 'markdown-it';
import { htmlentities, isSelfClosingTag } from '@joplin/utils/html';
import { compileWithFrontMatter, stripOffFrontMatter } from './utils/frontMatter';
import StateCore = require('markdown-it/lib/rules_core/state_core');
import { copy, mkdirp, remove, pathExists } from 'fs-extra';
import { basename, dirname } from 'path';
import markdownUtils, { MarkdownTable } from '@joplin/lib/markdownUtils';
import { readmeFileTitle } from './utils/parser';
import { chdir } from 'process';
import yargs = require('yargs');
import { extractOpenGraphTags } from './utils/openGraph';

const md5File = require('md5-file');
const htmlparser2 = require('@joplin/fork-htmlparser2');
const styleToJs = require('style-to-js').default;
const crypto = require('crypto');

interface Config {
	baseUrl: string;
	docusaurusBuildEnabled: boolean;
	docusaurusBuildCommand: string;
}

interface List {
	type: 'bullet' | 'number';
}

interface Context {
	currentTable?: MarkdownTable;
	currentTableContent?: string[];
	currentTableCellIndex?: number;
	inHeader?: boolean;
	listStack?: List[];
	listStarting?: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	currentLinkAttrs?: any;
	inFence?: boolean;
	processedFiles?: string[];
	isNews?: boolean;
	donateLinks?: string;
	inQuote?: boolean;
}

const configs: Record<string, Config> = {
	dev: {
		baseUrl: 'http://localhost:8077',
		docusaurusBuildCommand: 'buildDev',
		docusaurusBuildEnabled: true,
	},
	prod: {
		baseUrl: 'https://joplinapp.org',
		docusaurusBuildCommand: '_build',
		docusaurusBuildEnabled: true,
	},
};

const md5 = (s: string) => {
	return crypto.createHash('md5').update(s).digest('hex');
};

const parseHtml = (html: string) => {
	const output: string[] = [];

	interface Tag {
		name: string;
	}

	const tagStack: Tag[] = [];

	const currentTag = () => {
		if (!tagStack.length) return { name: '', processed: false };
		return tagStack[tagStack.length - 1];
	};

	const parser = new htmlparser2.Parser({

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		onopentag: (name: string, attrs: Record<string, any>) => {
			tagStack.push({ name });

			const closingSign = isSelfClosingTag(name) ? '/>' : '>';

			const attrHtml: string[] = [];

			for (const n in attrs) {
				if (!attrs.hasOwnProperty(n)) continue;
				let escapedValue = `"${htmlentities(attrs[n])}"`;
				if (n === 'style') {
					escapedValue = `{${JSON.stringify(styleToJs(attrs.style))}}`;
				}
				attrHtml.push(`${n}=${escapedValue}`);
			}

			output.push(`<${name} ${attrHtml.join(' ')}${closingSign}`);
		},

		ontext: (decodedText: string) => {
			output.push(htmlentities(decodedText));
		},

		onclosetag: (name: string) => {
			const current = currentTag();

			if (current.name === name) tagStack.pop();

			if (isSelfClosingTag(name)) return;
			output.push(`</${name}>`);
		},

	}, { decodeEntities: true });

	parser.write(html);
	parser.end();

	return output.join('');
};

const escapeForMdx = (s: string): string => {
	return s
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/`/g, '\\`');
};

const paragraphBreak = '///PARAGRAPH_BREAK///';
const blockQuoteStart = '///BLOCK_QUOTE_START///';
const blockQuoteEnd = '///BLOCK_QUOTE_END///';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const processToken = (token: any, output: string[], context: Context): void => {
	if (!context.listStack) context.listStack = [];

	let contentProcessed = false;
	const type = token.type as string;

	const currentList = context.listStack.length ? context.listStack[context.listStack.length - 1] : null;

	const doEscapeForMdx = (text: string) => {
		if (context.inFence) return text;
		return escapeForMdx(text);
	};

	const content: string[] = [];

	if (type === 'heading_open') {
		content.push(paragraphBreak);
		content.push(`${token.markup} `);
	} else if (type === 'heading_close') {
		content.push(paragraphBreak);
	} else if (type === 'paragraph_open' || type === 'paragraph_close') {
		if (!currentList) {
			content.push(paragraphBreak);
		}
	} else if (type === 'fence') {
		context.inFence = true;
		content.push(`\`\`\`${token.info || ''}\n`);
	} else if (type === 'html_block') {
		contentProcessed = true;
		content.push(parseHtml(token.content.trim()));
	} else if (type === 'html_inline') {
		contentProcessed = true;
		content.push(parseHtml(token.content.trim()));
	} else if (type === 'code_inline') {
		contentProcessed = true;
		content.push(`\`${token.content}\``);
	} else if (type === 'code_block') {
		contentProcessed = true;
		content.push(`\`\`\`\n${token.content}\`\`\``);
		content.push(paragraphBreak);
	} else if (type === 'strong_open' || type === 'strong_close') {
		content.push('**');
	} else if (type === 'em_open' || type === 'em_close') {
		content.push('*');
	} else if (type === 'blockquote_open' || type === 'blockquote_close') {
		content.push(type === 'blockquote_open' ? blockQuoteStart : blockQuoteEnd);
	} else if (type === 'table_open') {
		context.currentTable = {
			header: [],
			rows: [],
		};
		context.currentTableContent = [];
	} else if (type === 'th_open') {
		context.currentTable.header.push({
			label: '',
			name: `${context.currentTable.header.length}`,
			disableHtmlEscape: true,
		});
	} else if (type === 'thead_open') {
		context.inHeader = true;
	} else if (type === 'thead_close') {
		context.inHeader = false;
	} else if (type === 'th_close') {
		context.currentTable.header[context.currentTable.header.length - 1].label = context.currentTableContent.join('');
		context.currentTableContent = [];
	} else if (type === 'tr_open') {
		if (!context.inHeader) {
			context.currentTable.rows.push({});
			context.currentTableCellIndex = 0;
		}
	} else if (type === 'td_open') {
		const row = context.currentTable.rows[context.currentTable.rows.length - 1];
		row[`${context.currentTableCellIndex}`] = '';
	} else if (type === 'td_close') {
		const row = context.currentTable.rows[context.currentTable.rows.length - 1];
		row[`${context.currentTableCellIndex}`] = context.currentTableContent.join('');
		context.currentTableCellIndex++;
		context.currentTableContent = [];
	} else if (type === 'table_close') {
		const tableMd = markdownUtils.createMarkdownTable(context.currentTable.header, context.currentTable.rows);
		content.push(paragraphBreak);
		content.push(tableMd);
		content.push(paragraphBreak);
		context.currentTable = null;
	} else if (type === 'bullet_list_open') {
		context.listStarting = !context.listStack.length;
		context.listStack.push({ type: 'bullet' });
	} else if (type === 'ordered_list_open') {
		context.listStarting = !context.listStack.length;
		context.listStack.push({ type: 'number' });
	} else if (type === 'bullet_list_close' || type === 'ordered_list_close') {
		context.listStack.pop();
		if (!context.listStack.length) content.push(paragraphBreak);
	} else if (type === 'list_item_open') {
		if (!context.listStarting) content.push('\n');
		context.listStarting = false;
		const indent = '\t'.repeat((context.listStack.length - 1));
		if (currentList.type === 'bullet') content.push(`${indent}- `);
		if (currentList.type === 'number') content.push(`${indent + token.info}. `);
	} else if (type === 'image') {
		(context.currentTable ? context.currentTableContent : content).push('![');
	} else if (type === 'link_open') {
		content.push('[');
		context.currentLinkAttrs = token.attrs;
	} else if (type === 'link_close') {
		const href = context.currentLinkAttrs.find((a: string[]) => a[0] === 'href')[1];
		content.push(`](${escapeForMdx(href)})`);
		context.currentLinkAttrs = null;
	}

	if (token.children) {
		for (const child of token.children) {
			processToken(child, content, context);
		}
	} else if (token.content && !contentProcessed) {
		content.push(doEscapeForMdx(token.content));
	}

	if (type === 'fence') {
		content.push('```');
		content.push(paragraphBreak);
		context.inFence = false;
	}

	if (type === 'image') {
		let src: string = token.attrs.find((a: string[]) => a[0] === 'src')[1];
		if (!src.startsWith('http') && !src.startsWith('/')) src = `/${src}`;
		content.push(`](${doEscapeForMdx(src)})`);
	}

	for (const c of content) {
		if (context.currentTable) {
			context.currentTableContent.push(c);
		} else {
			output.push(c);
		}
	}
};

const resolveParagraphBreaks = (output: string[]): string[] => {
	if (!output.length) return output;

	while (output.length && output[0] === paragraphBreak) {
		output.splice(0, 1);
	}

	while (output.length && output[output.length - 1] === paragraphBreak) {
		output.pop();
	}

	let previous = '';
	const newOutput: string[] = [];
	for (const s of output) {
		if (s === paragraphBreak && previous === paragraphBreak) continue;
		newOutput.push(s === paragraphBreak ? '\n\n' : s);
		previous = s;
	}

	return newOutput;
};

const resolveBlockQuotes = (output: string): string => {
	if (!output) return output;

	const lines = output.split('\n');
	let inQuotes = false;
	const quotedLines: string[] = [];
	const newOutput: string[] = [];
	for (const line of lines) {
		if (line === blockQuoteStart) {
			inQuotes = true;
		} else if (line === blockQuoteEnd) {
			inQuotes = false;
			const s = quotedLines.join('\n').trim().split('\n').map(l => `> ${l}`).join('\n');
			newOutput.push(s);
		} else if (inQuotes) {
			quotedLines.push(line);
		} else {
			newOutput.push(line);
		}
	}

	return newOutput.join('\n');
};

export const processUrls = (md: string) => {
	md = md
		.replace(/https:\/\/github.com\/laurent22\/joplin\/blob\/dev\/readme\/(.*?)\/index\.md/g, '/help/$1')
		.replace(/https:\/\/github.com\/laurent22\/joplin\/blob\/dev\/readme\/(.*?)\.md/g, '/help/$1');

	return md;
};

export const processMarkdownDoc = (sourceContent: string, context: Context): string => {
	const markdownIt = new MarkdownIt({
		breaks: true,
		linkify: true,
		html: true,
	});

	let items: string[] = [];

	markdownIt.core.ruler.push('converter', (state: StateCore) => {
		const tokens = state.tokens;
		// console.info(JSON.stringify(tokens, null, '\t'));
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			processToken(token, items, context);
		}
	});

	const mdAndFrontMatter = stripOffFrontMatter(sourceContent);

	markdownIt.render(mdAndFrontMatter.doc);

	items = resolveParagraphBreaks(items);

	const output = resolveBlockQuotes(processUrls(items.join('').trim()));

	return compileWithFrontMatter({
		...mdAndFrontMatter,
		doc: output,
	});
};

const processMarkdownFile = async (sourcePath: string, destPath: string, context: Context) => {
	context.processedFiles.push(destPath);

	const sourceContent = await readFile(sourcePath, 'utf-8');
	const destContent = processMarkdownDoc(sourceContent, context);
	await mkdirp(dirname(destPath));

	const title = await readmeFileTitle(sourcePath);

	const mdAndFrontMatter = stripOffFrontMatter(destContent);
	mdAndFrontMatter.header.sidebar_label = title;

	if (context.isNews) {
		const dateString = basename(sourcePath).split('-')[0];
		const formatted = `${dateString.substring(0, 4)}-${dateString.substring(4, 6)}-${dateString.substring(6, 8)}`;
		mdAndFrontMatter.header.date = formatted;
	}

	const og = await extractOpenGraphTags(sourcePath);
	mdAndFrontMatter.header.title = og.title;
	mdAndFrontMatter.header.description = og.description;
	if (og.image) mdAndFrontMatter.header.image = og.image;

	mdAndFrontMatter.doc = mdAndFrontMatter.doc.replace(/^# (.*)\n/, `# $1\n\n${context.donateLinks}\n\n`);

	if (mdAndFrontMatter.header.forum_url) {
		mdAndFrontMatter.doc += `\n\n* * *\n\n[<icon icon="fa-brands fa-discourse" size="lg" /> Discuss on the forum](${mdAndFrontMatter.header.forum_url})`;
	}

	const fullContent = compileWithFrontMatter(mdAndFrontMatter);

	if (await pathExists(destPath)) {
		const existingMd5 = await md5File(destPath);
		const newMd5 = md5(fullContent);
		if (existingMd5 === newMd5) return;
	}

	await writeFile(destPath, fullContent, 'utf-8');
};

const processDocFiles = async (sourceDir: string, destDir: string, excluded: string[], context: Context) => {
	if (!context.processedFiles) context.processedFiles = [];

	await mkdirp(destDir);

	const files = await readdir(sourceDir);
	for (const file of files) {
		const fullPath = `${sourceDir}/${file}`;
		if (excluded.includes(fullPath)) continue;

		const info = await stat(fullPath);
		const destPath = `${destDir}/${file}`;

		if (info.isDirectory()) {
			await processDocFiles(fullPath, destPath, excluded, context);
		} else {
			if (file.endsWith('.md')) {
				console.info(`Process: ${fullPath}`);
				await processMarkdownFile(fullPath, destPath, context);
			} else if (file === '_category_.yml') {
				context.processedFiles.push(destPath);
				await copy(fullPath, destPath);
			}
		}
	}
};

export const deleteUnprocessedFiles = async (dirPath: string, processedFiles: string[]) => {
	const files = await readdir(dirPath);
	for (const file of files) {
		const fullPath = `${dirPath}/${file}`;
		const info = await stat(fullPath);

		if (info.isDirectory()) {
			await deleteUnprocessedFiles(fullPath, processedFiles);
		} else {
			if (!processedFiles.includes(fullPath)) {
				console.info(`Delete: ${fullPath}`);
				await remove(fullPath);
			}
		}
	}
};

const copyFile = async (sourceFile: string, destFile: string) => {
	console.info(`Copy: ${destFile}`);
	await copy(sourceFile, destFile);
};

const getDonateLinks = () => {
	return `<div className="donate-links">

[![Donate using PayPal](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/badges/Donate-PayPal-green.svg)](https://www.paypal.com/donate/?business=E8JMYD2LQ8MMA&no_recurring=0&item_name=I+rely+on+donations+to+maintain+and+improve+the+Joplin+open+source+project.+Thank+you+for+your+help+-+it+makes+a+difference%21&currency_code=EUR) [![Sponsor on GitHub](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/badges/GitHub-Badge.svg)](https://github.com/sponsors/laurent22/) [![Become a patron](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/badges/Patreon-Badge.svg)](https://www.patreon.com/joplin) [![Donate using IBAN](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/badges/Donate-IBAN.svg)](https://joplinapp.org/donate/#donations)

</div>`;
};

export const buildDocusaurus = async (docBuilderDir: string, buildCommand: string, baseUrl: string) => {
	chdir(docBuilderDir);
	await execCommand(`yarn ${buildCommand}`, {
		env: {
			WEBSITE_BASE_URL: baseUrl,
		},
	});
};

async function main() {
	const argv = await yargs.argv;
	const env = argv.env as string;

	if (!env) throw new Error('Env must be specified: either "dev" or "prod"');

	const config = { ...configs[env] };

	if ('docuBuild' in argv && !argv.docuBuild) config.docusaurusBuildEnabled = false;

	const rootDir = await getRootDir();
	const docBuilderDir = `${rootDir}/packages/doc-builder`;
	const destHelpDir = `${docBuilderDir}/help`;
	const newsDestDir = `${docBuilderDir}/news`;
	const readmeDir = `${rootDir}/readme`;

	const donateLinks = getDonateLinks();

	const mainContext: Context = { donateLinks };

	await processDocFiles(readmeDir, destHelpDir, [
		`${readmeDir}/_i18n`,
		`${readmeDir}/i18n`,
		`${readmeDir}/cla.md`,
		`${readmeDir}/download.md`,
		`${readmeDir}/faq_joplin_cloud.md`,
		`${readmeDir}/privacy.md`,
		`${readmeDir}/donate.md`,
		`${readmeDir}/connection_check.md`,
		`${readmeDir}/licenses.md`,
		`${readmeDir}/welcome`,
		`${readmeDir}/news`,
	], mainContext);

	await deleteUnprocessedFiles(destHelpDir, mainContext.processedFiles);

	const newsContext: Context = { isNews: true, donateLinks };
	await processDocFiles(`${readmeDir}/news`, newsDestDir, [], newsContext);
	await deleteUnprocessedFiles(newsDestDir, newsContext.processedFiles);

	if (await pathExists(`${readmeDir}/i18n`)) {
		const localeContext: Context = { donateLinks };
		await processDocFiles(`${readmeDir}/i18n`, `${docBuilderDir}/i18n`, [], localeContext);
		await deleteUnprocessedFiles(`${docBuilderDir}/i18n`, localeContext.processedFiles);
	} else {
		console.info('i18n folder is missing - skipping it');
	}

	await copyFile(`${rootDir}/Assets/WebsiteAssets/images`, `${docBuilderDir}/static/images`);

	if (config.docusaurusBuildEnabled) {
		await buildDocusaurus(docBuilderDir, config.docusaurusBuildCommand, config.baseUrl);
	} else {
		console.info('Skipping Docusaurus build...');
	}
}

if (require.main === module) {
	// eslint-disable-next-line promise/prefer-await-to-then
	main().catch((error) => {
		console.error('Fatal error');
		console.error(error);
		process.exit(1);
	});
}
