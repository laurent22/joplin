/* eslint-disable import/prefer-default-export */

const Entities = require('html-entities').AllHtmlEntities;

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

export const htmlentities = new Entities().encode;

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
