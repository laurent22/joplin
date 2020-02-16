const markdownUtils = require('lib/markdownUtils');
const htmlUtils = require('lib/htmlUtils');
const Setting = require('lib/models/Setting');
const Resource = require('lib/models/Resource');
const { MarkupToHtml } = require('lib/joplin-renderer');

class MarkupLanguageUtils {
	lib_(language) {
		if (language === MarkupToHtml.MARKUP_LANGUAGE_HTML) return htmlUtils;
		if (language === MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN) return markdownUtils;
		throw new Error(`Unsupported markup language: ${language}`);
	}

	extractImageUrls(language, text) {
		return this.lib_(language).extractImageUrls(text);
	}

	// Create a new MarkupToHtml instance while injecting options specific to Joplin
	// desktop and mobile applications.
	newMarkupToHtml(options = null) {
		const subValues = Setting.subValues('markdown.plugin', Setting.toPlainObject());
		const pluginOptions = {};
		for (const n in subValues) {
			pluginOptions[n] = { enabled: subValues[n] };
		}

		options = Object.assign({
			ResourceModel: Resource,
			pluginOptions: pluginOptions,
		}, options);

		return new MarkupToHtml(options);
	}
}

const markupLanguageUtils = new MarkupLanguageUtils();

module.exports = markupLanguageUtils;
