const Resource = require('lib/models/Resource');
const htmlUtils = require('lib/htmlUtils');
const utils = require('./utils');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

class HtmlToHtml {

	constructor(options) {
		this.resourceBaseUrl_ = 'resourceBaseUrl' in options ? options.resourceBaseUrl : null;
	}

	render(markup, theme, options) {
		const dom = new JSDOM(markup);
		
		// Replace all the image resource IDs by path to local files
		const imgs = dom.window.document.getElementsByTagName('img');
		for (const img of imgs) {
			if (!img.src) continue;
			const r = utils.imageReplacement(img.src, options.resources, this.resourceBaseUrl_);
			if (!r) continue;

			if (typeof r === 'string') {
				img.outerHTML = r;
			} else {
				for (const n in r) {
					img.setAttribute(n, r[n]);
				}
			}
		}

		// We need this extra style so that the images don't overflow
		const extraStyle = '<style>img {max-width: 100%;height: auto;}</style>'

		return {
			html: extraStyle + htmlUtils.headAndBodyHtml(dom.window.document),
			cssFiles: [],
		}
	}

}

module.exports = HtmlToHtml;