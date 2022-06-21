import markdownUtils from './markdownUtils';
import Setting from './models/Setting';
import shim from './shim';
import MarkupToHtml, { MarkupLanguage, Options } from '@joplin/renderer/MarkupToHtml';

import htmlUtils from './htmlUtils';
import Resource from './models/Resource';
import { PluginStates } from './services/plugins/reducer';

export class MarkupLanguageUtils {

	private lib_(language: MarkupLanguage) {
		if (language === MarkupLanguage.Html) return htmlUtils;
		if (language === MarkupLanguage.Markdown) return markdownUtils;
		throw new Error(`Unsupported markup language: ${language}`);
	}

	public extractImageUrls(language: MarkupLanguage, text: string): string[] {
		let urls: string[] = [];

		if (language === MarkupLanguage.Any) {
			urls = urls.concat(this.lib_(MarkupLanguage.Markdown).extractImageUrls(text));
			urls = urls.concat(this.lib_(MarkupLanguage.Html).extractImageUrls(text));
		} else {
			urls = this.lib_(language).extractImageUrls(text);
		}

		return urls;
	}

	public extractPdfUrls(language: MarkupLanguage, text: string): string[] {
		let urls: string[] = [];
		if (language === MarkupLanguage.Any) {
			urls = urls.concat(this.lib_(MarkupLanguage.Markdown).extractPdfUrls(text));
			urls = urls.concat(this.lib_(MarkupLanguage.Html).extractPdfUrls(text));
		} else {
			urls = this.lib_(language).extractPdfUrls(text);
		}
		return urls;
	}

	// Create a new MarkupToHtml instance while injecting options specific to Joplin
	// desktop and mobile applications.
	public newMarkupToHtml(_plugins: PluginStates = null, options: Options = null) {
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
			isSafeMode: Setting.value('isSafeMode'),
		}, options);

		return new MarkupToHtml(options);
	}
}

const markupLanguageUtils = new MarkupLanguageUtils();

export default markupLanguageUtils;
