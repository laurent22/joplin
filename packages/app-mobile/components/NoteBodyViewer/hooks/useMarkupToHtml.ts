import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import markupLanguageUtils from '@joplin/lib/markupLanguageUtils';
import { dirname } from '@joplin/lib/path-utils';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import { ContentScriptType } from '@joplin/lib/services/plugins/api/types';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { ExtraContentScript } from '@joplin/lib/services/plugins/utils/loadContentScripts';
import shim from '@joplin/lib/shim';
import { useMemo, useState } from 'react';


const useMarkupToHtml = (pluginStates: PluginStates) => {
	const [contentScripts, setContentScripts] = useState([]);

	// We load content scripts asynchronously because dynamic require doesn't
	// work in React Native.
	useAsyncEffect(async () => {
		// Because these content scripts lack a sandbox, we only allow evaling built-in plugin
		// JavaScript.
		const builtInPlugins: PluginStates = {};
		for (const id in pluginStates) {
			const plugin = PluginService.instance().pluginById(pluginStates[id].id);
			const builtIn = plugin.builtIn;
			if (builtIn) {
				builtInPlugins[id] = pluginStates[id];
			}
		}


		const contentScripts: ExtraContentScript[] = [];
		for (const pluginId in builtInPlugins) {
			const markdownItContentScripts = builtInPlugins[pluginId].contentScripts[ContentScriptType.MarkdownItPlugin];
			if (!markdownItContentScripts) continue;

			for (const contentScript of markdownItContentScripts) {
				const content = await shim.fsDriver().readFile(contentScript.path, 'utf8');

				// We use ES5-compatible JavaScript -- React Native Hermes may rely on Babel
				// for some features of ES6.
				const contentScriptModule = eval(`(function() {
					var module = { exports: null };
					var exports = {};

					${content}

					return module.exports || exports;
				})()`);

				const result = contentScriptModule.default({
					pluginId: pluginId,
					contentScriptId: contentScript.id,
				});
				contentScripts.push({
					id: contentScript.id,
					module: result,
					assetPath: dirname(contentScript.path),
					pluginId: pluginId,
				});
			}
		}

		setContentScripts(contentScripts);
	}, [pluginStates, setContentScripts]);
	return useMemo(() => {
		return markupLanguageUtils.newMarkupToHtml({}, {
			extraRendererRules: contentScripts,
		});

		// TODO: The original version of this hook also depended on isFirstRender.
		//       Before merging, determine whether this is necessary.
	}, [contentScripts]);
};

export default useMarkupToHtml;
