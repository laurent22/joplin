import { MarkupLanguageUtils as BaseMarkupLanguageUtils } from '../markupLanguageUtils';
import { PluginStates } from '../services/plugins/reducer';
import { contentScriptsToRendererRules } from '../services/plugins/utils/loadContentScripts';
import { Options } from '@joplin/renderer/MarkupToHtml';

class MarkupLanguageUtils extends BaseMarkupLanguageUtils {

	public newMarkupToHtml(plugins: PluginStates = null, options: Options = null) {
		plugins = plugins || {};

		return super.newMarkupToHtml(null, {
			extraRendererRules: contentScriptsToRendererRules(plugins),
			...options,
		});
	}

}

const markupLanguageUtils = new MarkupLanguageUtils();

export default markupLanguageUtils;
