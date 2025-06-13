const Entities = require('html-entities').AllHtmlEntities;
import { CssTypes, parse as cssParse, stringify as cssStringify } from '@adobe/css-tools';
import { dirname, basename } from 'path';
import parseHtmlAsync, { HtmlAttrs } from './utils/parseHtmlAsync';

const selfClosingElements = [
	'area',
	'base',
	'basefont',
	'br',
	'col',
	'command',
	'embed',
	'frame',
	'hr',
	'img',
	'input',
	'isindex',
	'keygen',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
];

const htmlentities = (s: string): string => {
	const output = (new Entities()).encode(s);
	return output.replace(/&Tab;/ig, '\t');
};

const attributesHtml = (attrs: HtmlAttrs) => {
	const output: string[] = [];

	for (const n in attrs) {
		if (!attrs.hasOwnProperty(n)) continue;
		output.push(`${n}="${htmlentities(attrs[n])}"`);
	}

	return output.join(' ');
};

const attrValue = (attrs: HtmlAttrs, name: string): string => {
	if (!attrs[name]) return '';
	return attrs[name];
};

const isSelfClosingTag = (tagName: string) => {
	return selfClosingElements.includes(tagName.toLowerCase());
};

export type FileApi = {
	exists(path: string): Promise<boolean>;
	readFileText(path: string): Promise<string>;
	readFileDataUri(path: string): Promise<string>;
};

// packToString should be able to run in React Native -- don't use fs-extra.
const packToString = async (baseDir: string, inputFileText: string, fs: FileApi) => {
	const readFileDataUriSafe = async (path: string) => {
		try {
			return await fs.readFileDataUri(path);
		} catch (error) {
			// If the file path is invalid, the Datauri will throw an exception.
			// Instead, since we can just ignore that particular file.
			// Fixes https://github.com/laurent22/joplin/issues/8305
			return '';
		}
	};

	const processCssContent = async (cssBaseDir: string, content: string) => {
		const o = cssParse(content, {
			silent: false,
		});

		for (const rule of o.stylesheet.rules) {
			if (rule.type === 'font-face') {
				for (const declaration of rule.declarations) {
					if (declaration.type === CssTypes.comment) {
						continue;
					}

					if (declaration.property === 'src') {
						const replacements = new Map<string, string>();
						const replacementTasks: Promise<void>[] = [];
						declaration.value.replace(/url\((.*?)\)/g, (match: string, url: string) => {
							if (replacements.has(url)) return match;
							replacements.set(url, match);

							replacementTasks.push((async () => {
								const cssFilePath = `${cssBaseDir}/${url}`;
								let replacement;
								if (await fs.exists(cssFilePath)) {
									replacement = `url(${await readFileDataUriSafe(cssFilePath)})`;
								} else {
									replacement = `url(${url})`;
								}
								replacements.set(url, replacement);
							})());

							return match;
						});

						await Promise.all(replacementTasks);

						declaration.value = declaration.value.replace(/url\((.*?)\)/g, (_match: string, url: string) => {
							return replacements.get(url);
						});

					}
				}
			}
		}

		return cssStringify(o);
	};

	const processLinkTag = async (_name: string, attrs: HtmlAttrs) => {
		const href = attrValue(attrs, 'href');
		if (!href) return null;

		const filePath = `${baseDir}/${href}`;

		if (!await fs.exists(filePath)) return null;
		const content = await fs.readFileText(filePath);
		return `<style>${await processCssContent(dirname(filePath), content)}</style>`;
	};

	const processScriptTag = async (_name: string, attrs: HtmlAttrs) => {
		const src = attrValue(attrs, 'src');
		if (!src) return null;

		const scriptFilePath = `${baseDir}/${src}`;
		let content = await fs.readFileText(scriptFilePath);

		// There's no simple way to insert arbitrary content in <script> tags.
		// Encoding HTML entities doesn't work because the JS parser will not decode
		// them before parsing. We also can't put the code verbatim since it may
		// contain strings such as `</script>` or `<!--` which would break the HTML
		// file.
		//
		// So it seems the only way is to escape these specific sequences with a
		// backslash. It shouldn't break the JS code and should allow the HTML
		// parser to work as expected.
		//
		// https://stackoverflow.com/a/41302266/561309

		content = content.replace(/<script>/g, '<\\script>');
		content = content.replace(/<\/script>/g, '<\\/script>');
		content = content.replace(/<!--/g, '<\\!--');

		return `<script>${content}</script>`;
	};

	const processImgTag = async (_name: string, attrs: HtmlAttrs) => {
		const src = attrValue(attrs, 'src');
		if (!src) return null;

		const filePath = `${baseDir}/${src}`;
		if (!await fs.exists(filePath)) return null;

		const modAttrs = { ...attrs };
		delete modAttrs.src;
		return `<img src="${await readFileDataUriSafe(filePath)}" ${attributesHtml(modAttrs)}/>`;
	};

	const processAnchorTag = async (_name: string, attrs: HtmlAttrs) => {
		const href = attrValue(attrs, 'href');
		if (!href) return null;

		const filePath = `${baseDir}/${href}`;
		if (!await fs.exists(filePath)) return null;

		const modAttrs = { ...attrs };
		modAttrs.href = await readFileDataUriSafe(filePath);
		modAttrs.download = basename(href);
		return `<a ${attributesHtml(modAttrs)}>`;
	};

	const output: string[] = [];

	interface Tag {
		name: string;
	}

	const tagStack: Tag[] = [];

	const currentTag = () => {
		if (!tagStack.length) return { name: '', processed: false };
		return tagStack[tagStack.length - 1];
	};

	await parseHtmlAsync(inputFileText, {
		onopentag: async (name: string, attrs: HtmlAttrs) => {
			name = name.toLowerCase();

			let processedResult = '';

			if (name === 'link') {
				processedResult = await processLinkTag(name, attrs);
			}

			if (name === 'script') {
				processedResult = await processScriptTag(name, attrs);
			}

			if (name === 'img') {
				processedResult = await processImgTag(name, attrs);
			}

			if (name === 'a') {
				processedResult = await processAnchorTag(name, attrs);
			}

			tagStack.push({ name });

			if (processedResult) {
				output.push(processedResult);
			} else {
				let attrHtml = attributesHtml(attrs);
				if (attrHtml) attrHtml = ` ${attrHtml}`;
				const closingSign = isSelfClosingTag(name) ? '/>' : '>';
				output.push(`<${name}${attrHtml}${closingSign}`);
			}
		},

		ontext: async (decodedText: string) => {
			if (currentTag().name === 'style') {
				// For CSS, we have to put the style as-is inside the tag because if we html-entities encode
				// it, it's not going to work. But it's ok because JavaScript won't run within the style tag.
				// Ideally CSS should be loaded from an external file.
				output.push(decodedText);
			} else {
				output.push(htmlentities(decodedText));
			}
		},

		onclosetag: async (name: string) => {
			const current = currentTag();

			if (current.name === name.toLowerCase()) tagStack.pop();

			if (isSelfClosingTag(name)) return;
			output.push(`</${name}>`);
		},

	});

	return output.join('');
};

export default packToString;

