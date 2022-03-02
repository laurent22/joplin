import { MarkupLanguageUtils as BaseMarkupLanguageUtils } from '@joplin/lib/markupLanguageUtils';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { contentScriptsToRendererRules } from '@joplin/lib/services/plugins/utils/loadContentScripts';
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
