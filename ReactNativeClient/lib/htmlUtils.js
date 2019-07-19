const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const urlUtils = require('lib/urlUtils.js');
const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = (new Entities()).encode;

class HtmlUtils {

	headAndBodyHtml(doc) {
		const output = [];
		if (doc.head) output.push(doc.head.innerHTML);
		if (doc.body) output.push(doc.body.innerHTML);
		return output.join('\n');
	}

	extractImageUrls(html) {
		if (!html) return [];

		const dom = new JSDOM(html);
		const imgs = dom.window.document.getElementsByTagName('img');
		const output = [];

		for (const img of imgs) {
			const src = img.getAttribute('src');
			if (!src) continue;
			output.push(src);
		}

		return output;
	}

	replaceImageUrls(html, callback) {
		if (!html) return '';

		const dom = new JSDOM(html);
		const doc = dom.window.document;
		const imgs = doc.getElementsByTagName('img');

		for (const img of imgs) {
			const src = img.getAttribute('src');
			const newSrc = callback(src);
			img.setAttribute('src', newSrc);
		}

		// This function returns the head and body but without the <head> and <body>
		// tag, which for our purpose are not needed and can cause issues when present.
		return this.headAndBodyHtml(doc);
	}

	prependBaseUrl(html, baseUrl) {
		const dom = new JSDOM(html);
		const doc = dom.window.document;
		const anchors = doc.getElementsByTagName('a');

		for (const anchor of anchors) {
			const href = anchor.getAttribute('href');
			if (!href) continue;
			const newHref = urlUtils.prependBaseUrl(href, baseUrl);
			anchor.setAttribute('href', newHref);
		}

		return this.headAndBodyHtml(doc);
	}

	attributesHtml(attr) {
		const output = [];

		for (const n in attr) {
			if (!attr.hasOwnProperty(n)) continue;
			output.push(n + '="' + htmlentities(attr[n]) + '"');
		}

		return output.join(' ');
	}

}

const htmlUtils = new HtmlUtils();

module.exports = htmlUtils;