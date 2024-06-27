import { Link } from './types';

const Entities = require('html-entities').AllHtmlEntities;
const htmlparser2 = require('@joplin/fork-htmlparser2');

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

const entitiesInstance = new Entities();

export const htmlentities = entitiesInstance.encode;
export const htmlentitiesDecode = entitiesInstance.decode;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const attributesHtml = (attr: Record<string, any>) => {
	const output = [];

	for (const n in attr) {
		if (!attr.hasOwnProperty(n)) continue;
		output.push(`${n}="${htmlentities(attr[n])}"`);
	}

	return output.join(' ');
};

export const isSelfClosingTag = (tagName: string) => {
	return selfClosingElements.includes(tagName.toLowerCase());
};

export const extractUrls = (html: string) => {
	if (!html || !html.trim()) return [];

	const output: Link[] = [];
	let currentLink: Link|null = null;

	const parser = new htmlparser2.Parser({

		onopentag: (name: string, attrs: Record<string, string>) => {
			if (name === 'a') {
				currentLink = {
					url: attrs && attrs.href ? attrs.href : '',
					title: '',
				};
			}
		},

		ontext: (text: string) => {
			if (currentLink) currentLink.title += text;
		},

		onclosetag: (name: string) => {
			if (name === 'a') {
				if (!currentLink) throw new Error('Found a closing anchor tag without an opening one');
				output.push(currentLink);
				currentLink = null;
			}
		},

	}, { decodeEntities: true });

	parser.write(html);
	parser.end();

	return output;
};

type SvgXml = {
	title: string;
	content: string;
};

export const extractSvgs = (html: string, titleGenerator: ()=> string): { svgs: SvgXml[]; html: string } => {
	if (!html || !html.trim()) return { svgs: [], html };

	const tagStack: string[] = [];
	const body: string[] = [];
	const svgs: SvgXml[] = [];
	let svgStack: string[] = [];

	let svgTagDepth = 0;
	let svgStyle = '';

	const currentTag = () => {
		if (!tagStack.length) return '';
		return tagStack[tagStack.length - 1];
	};

	const parser = new htmlparser2.Parser({

		onopentag: (name: string, attrs: Record<string, string>) => {
			tagStack.push(name);
			attrs = { ...attrs };

			if (name === 'svg') {
				svgStyle = attrs.style || '';
				svgTagDepth++;
			}

			let attrHtml = attributesHtml(attrs);
			if (attrHtml) attrHtml = ` ${attrHtml}`;
			const closingSign = isSelfClosingTag(name) ? '/>' : '>';
			if (svgTagDepth > 0) {
				svgStack.push(`<${name}${attrHtml}${closingSign}`);
			} else {
				body.push(`<${name}${attrHtml}${closingSign}`);
			}
		},

		ontext: (decodedText: string) => {
			if (currentTag() === 'style') {
				// For CSS, we have to put the style as-is inside the tag
				// because if we html-entities encode it, it's not going to
				// work. But it's ok because JavaScript won't run within the
				// style tag. Ideally CSS should be loaded from an external
				// file.

				// We however have to encode at least the `<` characters to
				// prevent certain XSS injections that would rely on the
				// content not being encoded (see sanitize_13.md)
				if (svgTagDepth > 0) {
					svgStack.push(decodedText.replace(/</g, '&lt;'));
				} else {
					body.push(decodedText.replace(/</g, '&lt;'));
				}
			} else {
				if (svgTagDepth > 0) {
					svgStack.push(decodedText.replace(/</g, '&lt;'));
				} else {
					body.push(htmlentities(decodedText));
				}
			}
		},

		onclosetag: (name: string) => {
			if (name === 'svg') {
				svgTagDepth--;
				if (svgTagDepth === 0) {
					svgStack.push('</svg>');
					const title = titleGenerator();
					svgs.push({
						title,
						content: svgStack.join(''),
					});
					body.push(`<img style="${svgStyle}" src="${title}" />`);
					svgStack = [];
					svgStyle = '';
					return;
				}
			}

			if (svgTagDepth > 0) {
				svgStack.push(`</${name}>`);
			} else {

				body.push(`</${name}>`);
			}
		},

	},
	{
		decodeEntities: true,
		lowerCaseAttributeNames: false,
	});

	parser.write(html);
	parser.end();

	return { svgs, html: body.join('') };
};

