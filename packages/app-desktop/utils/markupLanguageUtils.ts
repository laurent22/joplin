import { MarkupLanguageUtils as BaseMarkupLanguageUtils } from '@joplin/lib/markupLanguageUtils';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { contentScriptsToRendererRules } from '@joplin/lib/services/plugins/utils/loadContentScripts';

class MarkupLanguageUtils extends BaseMarkupLanguageUtils {

	public newMarkupToHtml(plugins: PluginStates, options: any = null) {
		return super.newMarkupToHtml({
			extraRendererRules: contentScriptsToRendererRules(plugins),
			...options,
		});
	}

}

const markupLanguageUtils = new MarkupLanguageUtils();

export default markupLanguageUtils;
