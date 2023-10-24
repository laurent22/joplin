import { getRootDir } from '@joplin/utils';
import { readFile, writeFile } from 'fs/promises';
import * as MarkdownIt from 'markdown-it';
import { attributesHtml, htmlentities, isSelfClosingTag } from '@joplin/utils/html';
import { stripOffFrontMatter } from './utils/frontMatter';
import StateCore = require('markdown-it/lib/rules_core/state_core');
const htmlparser2 = require('@joplin/fork-htmlparser2');

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
			const attrHtml = Object.keys(attrs).length ? attributesHtml(attrs) : ''; // '{' + JSON.stringify(attrs) + '}' : '';
			output.push(`<${name} ${attrHtml}${closingSign}`);
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

const processToken = (token: any, output: string[]): void => {
	const top = output.length ? output[output.length - 1] : '';
	let contentProcessed = false;

	if (token.type === 'heading_open') {
		output.push(`${token.markup} `);
	} else if (token.type === 'paragraph_open' || token.type === 'paragraph_close') {
		if (top !== '\n\n') output.push('\n\n');
	} else if (token.type === 'html_block') {
		contentProcessed = true,
		output.push(parseHtml(token.content.trim()));
	}

	if (token.children) {
		for (const child of token.children) {
			processToken(child, output);
		}
	} else if (token.content && !contentProcessed) {
		output.push(token.content);
	}
};

const processMarkdownFile = async (sourcePath: string, destPath: string) => {
	const sourceContent = await readFile(sourcePath, 'utf-8');

	const markdownIt = new MarkdownIt({
		breaks: true,
		linkify: true,
		html: true,
	});

	const output: string[] = [];

	markdownIt.core.ruler.push('converter', (state: StateCore) => {
		const tokens = state.tokens;
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			processToken(token, output);
		}
	});

	const processed = stripOffFrontMatter(sourceContent).doc;

	markdownIt.render(processed);

	const destContent = output.join('').trim();
	await writeFile(destPath, destContent, 'utf-8');
};

async function main() {
	const rootDir = await getRootDir();
	const destDir = `${rootDir}/packages/doc-builder/docs`;
	await processMarkdownFile(`${rootDir}/readme/news/20210804-085003.md`, `${destDir}/news/20210804-085003.md`);
}

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
