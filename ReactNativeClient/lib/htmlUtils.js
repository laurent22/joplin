const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const htmlUtils = {

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
	},

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
		const output = [];
		if (doc.head) output.push(doc.head.innerHTML);
		if (doc.body) output.push(doc.body.innerHTML);
		return output.join('\n');
	},  

};

module.exports = htmlUtils;