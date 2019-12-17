const htmlUtils = require('lib/htmlUtils');
const utils = require('./utils');
const noteStyle = require('./noteStyle');

class HtmlToHtml {
	constructor(options) {
		if (!options) options = {};
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

		const cssStrings = noteStyle(theme, options);
		const styleHtml = `<style>${cssStrings.join('\n')}</style>`;

		return {
			html: styleHtml + html,
			cssFiles: [],
		};
	}
}

module.exports = HtmlToHtml;
