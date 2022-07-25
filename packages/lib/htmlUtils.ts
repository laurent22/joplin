const urlUtils = require('./urlUtils.js');
const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;
const { escapeHtml } = require('./string-utils.js');

// [\s\S] instead of . for multiline matching
// https://stackoverflow.com/a/16119722/561309
const imageRegex = /<img([\s\S]*?)src=["']([\s\S]*?)["']([\s\S]*?)>/gi;
const anchorRegex = /<a([\s\S]*?)href=["']([\s\S]*?)["']([\s\S]*?)>/gi;
const embedRegex = /<embed([\s\S]*?)src=["']([\s\S]*?)["']([\s\S]*?)>/gi;
const objectRegex = /<object([\s\S]*?)data=["']([\s\S]*?)["']([\s\S]*?)>/gi;
const pdfUrlRegex = /[\s\S]*?\.pdf$/i;

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
	private extractUrls(regex: RegExp, html: string) {
		if (!html) return [];

		const output = [];
		let matches;
		while ((matches = regex.exec(html))) {
			output.push(matches[2]);
		}

		return output.filter(url => !!url);
	}

	// Returns the **encoded** URLs, so to be useful they should be decoded again before use.
	public extractImageUrls(html: string) {
		return this.extractUrls(imageRegex, html);
	}

	// Returns the **encoded** URLs, so to be useful they should be decoded again before use.
	public extractPdfUrls(html: string) {
		return [...this.extractUrls(embedRegex, html), ...this.extractUrls(objectRegex, html)].filter(url => pdfUrlRegex.test(url));
	}

	// Returns the **encoded** URLs, so to be useful they should be decoded again before use.
	public extractAnchorUrls(html: string) {
		return this.extractUrls(anchorRegex, html);
	}

	// Returns the **encoded** URLs, so to be useful they should be decoded again before use.
	public extractFileUrls(html: string) {
		return this.extractImageUrls(html).concat(this.extractAnchorUrls(html));
	}

	public replaceResourceUrl(html: string, urlToReplace: string, id: string) {
		const htmlLinkRegex = `(?<=(?:src|href)=["'])${urlToReplace}(?=["'])`;
		const htmlReg = new RegExp(htmlLinkRegex, 'g');
		return html.replace(htmlReg, `:/${id}`);
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

	public replaceEmbedUrls(html: string, callback: Function) {
		if (!html) return '';
		// We are adding the link as <a> since joplin disabled <embed>, <object> tags due to security reasons.
		// See: CVE-2020-15930
		html = html.replace(embedRegex, (_v: string, _before: string, src: string, _after: string) => {
			const link = callback(src);
			return `<a href="${link}">${escapeHtml(src)}</a>`;
		});
		html = html.replace(objectRegex, (_v: string, _before: string, src: string, _after: string) => {
			const link = callback(src);
			return `<a href="${link}">${escapeHtml(src)}</a>`;
		});
		return html;
	}

	public replaceMediaUrls(html: string, callback: Function) {
		html = this.replaceImageUrls(html, callback);
		html = this.replaceEmbedUrls(html, callback);
		return html;
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
