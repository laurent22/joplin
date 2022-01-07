import * as fs from 'fs-extra';
const Entities = require('html-entities').AllHtmlEntities;
const htmlparser2 = require('@joplin/fork-htmlparser2');
const Datauri = require('datauri/sync');
const cssParse = require('css/lib/parse');
const cssStringify = require('css/lib/stringify');

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

const dataUriEncode = (filePath: string): string => {
	const result = Datauri(filePath);
	return result.content;
};

const attributesHtml = (attr: any) => {
	const output = [];

	for (const n in attr) {
		if (!attr.hasOwnProperty(n)) continue;
		output.push(`${n}="${htmlentities(attr[n])}"`);
	}

	return output.join(' ');
};

const attrValue = (attrs: any, name: string): string => {
	if (!attrs[name]) return '';
	return attrs[name];
};

const isSelfClosingTag = (tagName: string) => {
	return selfClosingElements.includes(tagName.toLowerCase());
};

const processCssContent = (cssBaseDir: string, content: string): string => {
	const o = cssParse(content, {
		silent: false,
	});

	for (const rule of o.stylesheet.rules) {
		if (rule.type === 'font-face') {
			for (const declaration of rule.declarations) {
				if (declaration.property === 'src') {
					declaration.value = declaration.value.replace(/url\((.*?)\)/g, (_v: any, url: string) => {
						const cssFilePath = `${cssBaseDir}/${url}`;
						if (fs.existsSync(cssFilePath)) {
							return `url(${dataUriEncode(cssFilePath)})`;
						} else {
							return `url(${url})`;
						}
					});
				}
			}
		}
	}

	return cssStringify(o);
};

const processLinkTag = (baseDir: string, _name: string, attrs: any): string => {
	const href = attrValue(attrs, 'href');
	if (!href) return null;

	const filePath = `${baseDir}/${href}`;

	const content = fs.readFileSync(filePath, 'utf8');
	return `<style>${processCssContent(dirname(filePath), content)}</style>`;
};

const processScriptTag = (baseDir: string, _name: string, attrs: any): string => {
	const src = attrValue(attrs, 'src');
	if (!src) return null;

	const scriptFilePath = `${baseDir}/${src}`;
	let content = fs.readFileSync(scriptFilePath, 'utf8');

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

const processImgTag = (baseDir: string, _name: string, attrs: any): string => {
	const src = attrValue(attrs, 'src');
	if (!src) return null;

	const filePath = `${baseDir}/${src}`;
	if (!fs.existsSync(filePath)) return null;

	const modAttrs = { ...attrs };
	delete modAttrs.src;
	return `<img src="${dataUriEncode(filePath)}" ${attributesHtml(modAttrs)}/>`;
};

const processAnchorTag = (baseDir: string, _name: string, attrs: any): string => {
	const href = attrValue(attrs, 'href');
	if (!href) return null;

	const filePath = `${baseDir}/${href}`;
	if (!fs.existsSync(filePath)) return null;

	const modAttrs = { ...attrs };
	modAttrs.href = dataUriEncode(filePath);
	modAttrs.download = basename(filePath);
	return `<a ${attributesHtml(modAttrs)}>`;
};

function basename(path: string) {
	if (!path) throw new Error('Path is empty');
	const s = path.split(/\/|\\/);
	return s[s.length - 1];
}

function dirname(path: string) {
	if (!path) throw new Error('Path is empty');
	const s = path.split(/\/|\\/);
	s.pop();
	return s.join('/');
}

export default async function htmlpack(inputFile: string, outputFile: string): Promise<void> {
	const inputHtml = await fs.readFile(inputFile, 'utf8');
	const baseDir = dirname(inputFile);

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

		onopentag: (name: string, attrs: any) => {
			name = name.toLowerCase();

			let processedResult = '';

			if (name === 'link') {
				processedResult = processLinkTag(baseDir, name, attrs);
			}

			if (name === 'script') {
				processedResult = processScriptTag(baseDir, name, attrs);
			}

			if (name === 'img') {
				processedResult = processImgTag(baseDir, name, attrs);
			}

			if (name === 'a') {
				processedResult = processAnchorTag(baseDir, name, attrs);
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

		ontext: (decodedText: string) => {
			if (currentTag().name === 'style') {
				// For CSS, we have to put the style as-is inside the tag because if we html-entities encode
				// it, it's not going to work. But it's ok because JavaScript won't run within the style tag.
				// Ideally CSS should be loaded from an external file.
				output.push(decodedText);
			} else {
				output.push(htmlentities(decodedText));
			}
		},

		onclosetag: (name: string) => {
			const current = currentTag();

			if (current.name === name.toLowerCase()) tagStack.pop();

			if (isSelfClosingTag(name)) return;
			output.push(`</${name}>`);
		},

	}, { decodeEntities: true });

	parser.write(inputHtml);
	parser.end();

	await fs.writeFile(outputFile, output.join(''), 'utf8');
}
