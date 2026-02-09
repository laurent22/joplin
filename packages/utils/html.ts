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

const parseDimensionAttribute = (value: string) => {
	const regex = /^([0-9]*\.?[0-9]+)\s*(in|cm|mm|pt|pc|px)?$/i;
	const m = value.trim().match(regex);
	if (!m) return null;
	const num = parseFloat(m[1]);
	const unit = m[2]?.toLowerCase() || 'px';
	return { num, unit };
};

const dimensionAttributeInPixels = (value: string) => {
	const parsed = parseDimensionAttribute(value);
	if (!parsed) {
		return null;
	} else {
		switch (parsed.unit) {
		case 'px':
			return parsed.num;
		case 'in':
			return parsed.num * 96;
		case 'cm':
			return parsed.num * 96 / 2.54;
		case 'mm':
			return parsed.num * 96 / 25.4;
		case 'pt':
			return parsed.num * 96 / 72;
		case 'pc':
			return parsed.num * 16;
		default:
			return null;
		}
	}
};

// Currently this function only fix the width and height attributes: those should be specified in
// pixels, however certain application (such as Evernote) occasionally specify them in inches. When
// that happens, and we import it, Electron is going to ignore the unit and assume pixels. So "1in"
// becomes 1 pixel. So the function below is used to convert those invalid values to actual pixel
// values by converting them properly.
//
// Currently only used in import-enex-html-gen.js and tested there.
//
// Ref: https://html.spec.whatwg.org/multipage/embedded-content-other.html#dimension-attributes
export const fixAttributes = (attributes: Record<string, string>) => {
	const output: Record<string, string> = {};
	for (const [keyRaw, value] of Object.entries(attributes)) {
		const key = keyRaw.toLowerCase();
		let finalValue = value;

		if (key === 'width' || key === 'height') {
			const pixelValue = dimensionAttributeInPixels(value);

			if (pixelValue === null) {
				// Skip if the value can't be parsed, which means the image will display at its real
				// size. Better than letting bad values go through as it may cause rendering issues.
				continue;
			}

			finalValue = pixelValue.toString();
		}

		output[keyRaw] = finalValue;
	}

	return output;
};
