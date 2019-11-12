const urlUtils = require('lib/urlUtils.js');
const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;

// [\s\S] instead of . for multiline matching
// https://stackoverflow.com/a/16119722/561309
const imageRegex = /<img([\s\S]*?)src=["']([\s\S]*?)["']([\s\S]*?)>/gi;
const anchorRegex = /<a([\s\S]*?)href=["']([\s\S]*?)["']([\s\S]*?)>/gi;

class HtmlUtils {
	headAndBodyHtml(doc) {
		const output = [];
		if (doc.head) output.push(doc.head.innerHTML);
		if (doc.body) output.push(doc.body.innerHTML);
		return output.join('\n');
	}

	extractImageUrls(html) {
		if (!html) return [];

		const output = [];
		let matches;
		while ((matches = imageRegex.exec(html))) {
			output.push(matches[2]);
		}

		return output;
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
}

const htmlUtils = new HtmlUtils();

module.exports = htmlUtils;
