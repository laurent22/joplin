import * as Mustache from 'mustache';
import { filename } from '@joplin/lib/path-utils';
import * as fs from 'fs-extra';
import { TemplateParams } from './types';
const MarkdownIt = require('markdown-it');

export async function loadMustachePartials(partialDir: string) {
	const output: Record<string, string> = {};
	const files = await fs.readdir(partialDir);
	for (const f of files) {
		const name = filename(f);
		const templateContent = await fs.readFile(`${partialDir}/${f}`, 'utf8');
		output[name] = templateContent;
	}
	return output;
}

export function renderMustache(contentHtml: string, templateParams: TemplateParams) {
	return Mustache.render(templateParams.templateHtml, {
		...templateParams,
		contentHtml,
	}, templateParams.partials);
}

export function getMarkdownIt() {
	return new MarkdownIt({
		breaks: true,
		linkify: true,
		html: true,
	});
}

export function markdownToPageHtml(md: string, templateParams: TemplateParams): string {
	const markdownIt = getMarkdownIt();

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

	return renderMustache(markdownIt.render(md), templateParams);
}
