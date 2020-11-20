import markdownUtils from './markdownUtils';
import Setting from './models/Setting';
import shim from './shim';
import MarkupToHtml, { MarkupLanguage } from '@joplin/renderer/MarkupToHtml';

const htmlUtils = require('./htmlUtils');
const Resource = require('./models/Resource');

class MarkupLanguageUtils {
	lib_(language: MarkupLanguage) {
		if (language === MarkupLanguage.Html) return htmlUtils;
		if (language === MarkupLanguage.Markdown) return markdownUtils;
		throw new Error(`Unsupported markup language: ${language}`);
	}

	extractImageUrls(language: MarkupLanguage, text: string) {
		return this.lib_(language).extractImageUrls(text);
	}

	// Create a new MarkupToHtml instance while injecting options specific to Joplin
	// desktop and mobile applications.
	newMarkupToHtml(options: any = null) {
		const subValues = Setting.subValues('markdown.plugin', Setting.toPlainObject());
		const pluginOptions: any = {};
		for (const n in subValues) {
			pluginOptions[n] = { enabled: subValues[n] };
		}

		options = Object.assign({
			ResourceModel: Resource,
			pluginOptions: pluginOptions,
			tempDir: Setting.value('tempDir'),
			fsDriver: shim.fsDriver(),
		}, options);

		return new MarkupToHtml(options);
	}
}

const markupLanguageUtils = new MarkupLanguageUtils();

export default markupLanguageUtils;
