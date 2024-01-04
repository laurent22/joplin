import { PluginData } from '@joplin/editor/types';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import { ContentScriptType } from '@joplin/lib/services/plugins/api/types';
import shim from '@joplin/lib/shim';
import { useMemo } from 'react';

const useCodeMirrorPlugins = () => {
	return useMemo(() => {
		const pluginService = PluginService.instance();

		const plugins: PluginData[] = [];

		for (const pluginId of pluginService.pluginIds) {
			const plugin = pluginService.pluginById(pluginId);

			const contentScripts = plugin.contentScriptsByType(ContentScriptType.CodeMirrorPlugin);
			for (const contentScript of contentScripts) {
				const contentScriptId = contentScript.id;
				plugins.push({
					pluginId,
					contentScriptId,
					contentScriptJs: async () => {
						return await shim.fsDriver().readFile(contentScript.path);
					},
					postMessageHandler: async (message: any): Promise<any> => {
						return plugin.emitContentScriptMessage(contentScriptId, message);
					},
				});
			}
		}

		return plugins;
	}, []);
};

export default useCodeMirrorPlugins;
