const htmlUtils = require('lib/htmlUtils');
const utils = require('./utils');

class HtmlToHtml {
	constructor(options) {
		this.resourceBaseUrl_ = 'resourceBaseUrl' in options ? options.resourceBaseUrl : null;
	}

	render(markup, theme, options) {
		const html = htmlUtils.processImageTags(markup, data => {
			if (!data.src) return null;

			const r = utils.imageReplacement(data.src, options.resources, this.resourceBaseUrl_);
			if (!r) return null;

			if (typeof r === 'string') {
				return {
					type: 'replaceElement',
					html: r,
				};
			} else {
				return {
					type: 'setAttributes',
					attrs: r,
				};
			}
		});

		return {
			html: html,
			cssFiles: [],
		};
	}
}

module.exports = HtmlToHtml;
