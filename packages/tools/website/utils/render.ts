import * as Mustache from 'mustache';
import { filename } from '@joplin/lib/path-utils';
import * as fs from 'fs-extra';
import { TemplateParams } from './types';
import { headerAnchor } from '@joplin/renderer';
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

	markdownIt.use(headerAnchor);

	return renderMustache(markdownIt.render(md), templateParams);
}
