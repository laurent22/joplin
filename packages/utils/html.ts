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
