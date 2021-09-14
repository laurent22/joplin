const urlUtils = require('lib/urlUtils.js');
const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;
const htmlparser2 = require('htmlparser2');

// [\s\S] instead of . for multiline matching
// https://stackoverflow.com/a/16119722/561309
const imageRegex = /<img([\s\S]*?)src=["']([\s\S]*?)["']([\s\S]*?)>/gi;
const anchorRegex = /<a([\s\S]*?)href=["']([\s\S]*?)["']([\s\S]*?)>/gi;

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

class HtmlUtils {
	headAndBodyHtml(doc) {
		const output = [];
		if (doc.head) output.push(doc.head.innerHTML);
		if (doc.body) output.push(doc.body.innerHTML);
		return output.join('\n');
	}

	isSelfClosingTag(tagName) {
		return selfClosingElements.includes(tagName.toLowerCase());
	}

	extractImageUrls(html) {
		if (!html) return [];

		const output = [];
		let matches;
		while ((matches = imageRegex.exec(html))) {
			output.push(matches[2]);
		}

		return output.filter(url => !!url);
	}

	replaceImageUrls(html, callback) {
		return this.processImageTags(html, data => {
			const newSrc = callback(data.src);
			return {
				type: 'replaceSource',
				src: newSrc,
			};
		});
	}

	processImageTags(html, callback) {
		if (!html) return '';

		return html.replace(imageRegex, (v, before, src, after) => {
			const action = callback({ src: src });

			if (!action) return `<img${before}src="${src}"${after}>`;

			if (action.type === 'replaceElement') {
				return action.html;
			}

			if (action.type === 'replaceSource') {
				return `<img${before}src="${action.src}"${after}>`;
			}

			if (action.type === 'setAttributes') {
				const attrHtml = this.attributesHtml(action.attrs);
				return `<img${before}${attrHtml}${after}>`;
			}

			throw new Error(`Invalid action: ${action.type}`);
		});
	}

	prependBaseUrl(html, baseUrl) {
		if (!html) return '';

		return html.replace(anchorRegex, (v, before, href, after) => {
			const newHref = urlUtils.prependBaseUrl(href, baseUrl);
			return `<a${before}href="${newHref}"${after}>`;
		});
	}

	attributesHtml(attr) {
		const output = [];

		for (const n in attr) {
			if (!attr.hasOwnProperty(n)) continue;
			output.push(`${n}="${htmlentities(attr[n])}"`);
		}

		return output.join(' ');
	}

	stripHtml(html) {
		const output = [];

		const tagStack = [];

		const currentTag = () => {
			if (!tagStack.length) return '';
			return tagStack[tagStack.length - 1];
		};

		const disallowedTags = ['script', 'style', 'head', 'iframe', 'frameset', 'frame', 'object', 'base'];

		const parser = new htmlparser2.Parser({

			onopentag: (name) => {
				tagStack.push(name.toLowerCase());
			},

			ontext: (decodedText) => {
				if (disallowedTags.includes(currentTag())) return;
				output.push(decodedText);
			},

			onclosetag: (name) => {
				if (currentTag() === name.toLowerCase()) tagStack.pop();
			},

		}, { decodeEntities: true });

		parser.write(html);
		parser.end();

		return output.join('').replace(/\s+/g, ' ');
	}
}

const htmlUtils = new HtmlUtils();

module.exports = htmlUtils;
