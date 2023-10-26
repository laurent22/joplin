/* eslint-disable import/prefer-default-export */

import { getRootDir } from '@joplin/utils';
import { readFile, readdir, stat, writeFile } from 'fs/promises';
import * as MarkdownIt from 'markdown-it';
import { htmlentities, isSelfClosingTag } from '@joplin/utils/html';
import { stripOffFrontMatter } from './utils/frontMatter';
import StateCore = require('markdown-it/lib/rules_core/state_core');
import { copy, mkdirp } from 'fs-extra';
import { dirname } from 'path';
import markdownUtils, { MarkdownTable } from '@joplin/lib/markdownUtils';
import { readmeFileTitle } from './utils/parser';

const htmlparser2 = require('@joplin/fork-htmlparser2');
const styleToJs = require('style-to-js').default;

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
	currentListAttrs?: any;
}

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
		.replace(/</g, '&gt;')
		.replace(/>/g, '&lt;');
};

const processToken = (token: any, output: string[], context: Context): void => {
	if (!context.listStack) context.listStack = [];

	const top = output.length ? output[output.length - 1] : '';
	let contentProcessed = false;
	const type = token.type as string;

	const currentList = context.listStack.length ? context.listStack[context.listStack.length - 1] : null;

	const content: string[] = [];

	if (type === 'heading_open') {
		content.push(`${token.markup} `);
	} else if (type === 'heading_close') {
		content.push('\n\n');
	} else if (type === 'paragraph_open' || type === 'paragraph_close') {
		if (!currentList) {
			if (top !== '\n\n') content.push('\n\n');
		}
	} else if (type === 'fence') {
		content.push(`\`\`\`${token.info || ''}\n`);
	} else if (type === 'html_block') {
		contentProcessed = true,
		content.push(parseHtml(token.content.trim()));
	} else if (type === 'code_inline') {
		contentProcessed = true,
		content.push(`\`${token.content}\``);
	} else if (type === 'code_block') {
		contentProcessed = true;
		content.push(`\`\`\`\n${token.content}\`\`\``);
		content.push('\n\n');
	} else if (type === 'strong_open' || type === 'strong_close') {
		content.push('**');
	} else if (type === 'em_open' || type === 'em_close') {
		content.push('*');
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
		content.push(tableMd);
		context.currentTable = null;
	} else if (type === 'bullet_list_open') {
		context.listStarting = !context.listStack.length;
		context.listStack.push({ type: 'bullet' });
	} else if (type === 'ordered_list_open') {
		context.listStarting = !context.listStack.length;
		context.listStack.push({ type: 'number' });
	} else if (type === 'bullet_list_close' || type === 'ordered_list_close') {
		context.listStack.pop();
		if (!context.listStack.length) content.push('\n\n');
	} else if (type === 'list_item_open') {
		if (!context.listStarting) content.push('\n');
		context.listStarting = false;
		const indent = '\t'.repeat((context.listStack.length - 1));
		if (currentList.type === 'bullet') content.push(`${indent}- `);
		if (currentList.type === 'number') content.push(`${indent + token.info}. `);
	} else if (type === 'image') {
		content.push('![');
	} else if (type === 'link_open') {
		content.push('[');
		context.currentListAttrs = token.attrs;
	} else if (type === 'link_close') {
		const href = context.currentListAttrs.find((a: string[]) => a[0] === 'href')[1];
		content.push(`](${escapeForMdx(href)})`);
		context.currentListAttrs = null;
	}

	if (token.children) {
		for (const child of token.children) {
			processToken(child, content, context);
		}
	} else if (token.content && !contentProcessed) {
		content.push(escapeForMdx(token.content));
	}

	if (type === 'fence') {
		content.push('```');
		content.push('\n\n');
	}

	if (type === 'image') {
		let src: string = token.attrs.find((a: string[]) => a[0] === 'src')[1];
		if (!src.startsWith('http') && !src.startsWith('/')) src = `/${src}`;
		content.push(`](${escapeForMdx(src)})`);
	}

	for (const c of content) {
		if (context.currentTable) {
			context.currentTableContent.push(c);
		} else {
			output.push(c);
		}
	}
};

export const processMarkdownDoc = (sourceContent: string, context: Context): string => {
	const markdownIt = new MarkdownIt({
		breaks: true,
		linkify: true,
		html: true,
	});

	const output: string[] = [];

	markdownIt.core.ruler.push('converter', (state: StateCore) => {
		const tokens = state.tokens;
		// console.info(JSON.stringify(tokens, null, '\t'));
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			processToken(token, output, context);
		}
	});

	const processed = stripOffFrontMatter(sourceContent).doc;

	markdownIt.render(processed);

	return output.join('').trim();
};

const escapeFrontMatterValue = (v: string) => {
	return v
		.replace(/"/g, '\\"')
		.replace(/[\n\r]/g, ' ');
};

const processMarkdownFile = async (sourcePath: string, destPath: string, context: Context) => {
	const sourceContent = await readFile(sourcePath, 'utf-8');
	const destContent = processMarkdownDoc(sourceContent, context);
	await mkdirp(dirname(destPath));

	const title = await readmeFileTitle(sourcePath);

	const frontMatter = `---
sidebar_label: "${escapeFrontMatterValue(title)}"
---`;

	await writeFile(destPath, `${frontMatter}\n\n${destContent}`, 'utf-8');
};

const processMarkdownFiles = async (sourceDir: string, destDir: string, excluded: string[], context: Context) => {
	const files = await readdir(sourceDir);
	for (const file of files) {
		const fullPath = `${sourceDir}/${file}`;
		if (excluded.includes(fullPath)) continue;

		const info = await stat(fullPath);

		if (info.isDirectory()) {
			await processMarkdownFiles(fullPath, `${destDir}/${file}`, excluded, context);
		} else {
			if (!file.endsWith('.md')) continue;
			console.info(`Process ${fullPath}`);
			const destPath = `${destDir}/${file}`;
			await processMarkdownFile(fullPath, destPath, context);
		}
	}
};

async function main() {
	const rootDir = await getRootDir();
	const docBuilderDir = `${rootDir}/packages/doc-builder`;

	const context: Context = {};

	await processMarkdownFiles(`${rootDir}/readme`, `${docBuilderDir}/docs`, [
		`${rootDir}/readme/download.md`,
		`${rootDir}/readme/_i18n`,
	], context);

	await copy(`${rootDir}/Assets/WebsiteAssets/images`, `${docBuilderDir}/static/images`);
	await copy(`${rootDir}/readme/welcome/AllClients.png`, `${docBuilderDir}/static/AllClients.png`);
	await copy(`${rootDir}/readme/welcome/WebClipper.png`, `${docBuilderDir}/static/WebClipper.png`);
	await copy(`${rootDir}/readme/welcome/SubNotebooks.png`, `${docBuilderDir}/static/SubNotebooks.png`);
}

if (require.main === module) {
	// eslint-disable-next-line promise/prefer-await-to-then
	main().catch((error) => {
		console.error('Fatal error');
		console.error(error);
		process.exit(1);
	});
}
