const urlUtils = require('./urlUtils.js');
const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;
const htmlparser2 = require('@joplin/fork-htmlparser2');
const { escapeHtml } = require('./string-utils.js');

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

	public headAndBodyHtml(doc: any) {
		const output = [];
		if (doc.head) output.push(doc.head.innerHTML);
		if (doc.body) output.push(doc.body.innerHTML);
		return output.join('\n');
	}

	public isSelfClosingTag(tagName: string) {
		return selfClosingElements.includes(tagName.toLowerCase());
	}

	// Returns the **encoded** URLs, so to be useful they should be decoded again before use.
	public extractImageUrls(html: string) {
		if (!html) return [];

		const output = [];
		let matches;
		while ((matches = imageRegex.exec(html))) {
			output.push(matches[2]);
		}

		return output.filter(url => !!url);
	}

	public replaceImageUrls(html: string, callback: Function) {
		return this.processImageTags(html, (data: any) => {
			const newSrc = callback(data.src);
			return {
				type: 'replaceSource',
				src: newSrc,
			};
		});
	}

	// Note that the URLs provided by this function are URL-encoded, which is
	// usually what you want for web URLs. But if they are file:// URLs and the
	// file path is going to be used, it will need to be unescaped first. The
	// transformed SRC, must also be escaped before being sent back to this
	// function.
	public processImageTags(html: string, callback: Function) {
		if (!html) return '';

		return html.replace(imageRegex, (_v: string, before: string, src: string, after: string) => {
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

	public prependBaseUrl(html: string, baseUrl: string) {
		if (!html) return '';

		return html.replace(anchorRegex, (_v: string, before: string, href: string, after: string) => {
			const newHref = urlUtils.prependBaseUrl(href, baseUrl);
			return `<a${before}href="${newHref}"${after}>`;
		});
	}

	public attributesHtml(attr: any) {
		const output = [];

		for (const n in attr) {
			if (!attr.hasOwnProperty(n)) continue;
			output.push(`${n}="${htmlentities(attr[n])}"`);
		}

		return output.join(' ');
	}

	public stripHtml(html: string) {
		const output: string[] = [];

		const tagStack: any[] = [];

		const currentTag = () => {
			if (!tagStack.length) return '';
			return tagStack[tagStack.length - 1];
		};

		const disallowedTags = ['script', 'style', 'head', 'iframe', 'frameset', 'frame', 'object', 'base'];

		const parser = new htmlparser2.Parser({

			onopentag: (name: string) => {
				tagStack.push(name.toLowerCase());
			},

			ontext: (decodedText: string) => {
				if (disallowedTags.includes(currentTag())) return;
				output.push(decodedText);
			},

			onclosetag: (name: string) => {
				if (currentTag() === name.toLowerCase()) tagStack.pop();
			},

		}, { decodeEntities: true });

		parser.write(html);
		parser.end();

		return output.join('').replace(/\s+/g, ' ');
	}
}

export default new HtmlUtils();

export function plainTextToHtml(plainText: string): string {
	const lines = plainText
		.replace(/[\n\r]/g, '\n')
		.split('\n');

	const lineOpenTag = lines.length > 1 ? '<p>' : '';
	const lineCloseTag = lines.length > 1 ? '</p>' : '';

	return lines
		.map(line => lineOpenTag + escapeHtml(line) + lineCloseTag)
		.join('');
}
