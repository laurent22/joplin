import { PluginData } from '@joplin/editor/types';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import { ContentScriptType } from '@joplin/lib/services/plugins/api/types';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import shim from '@joplin/lib/shim';
import { useMemo } from 'react';

const useCodeMirrorPlugins = (pluginStates: PluginStates) => {
	return useMemo(() => {
		const pluginService = PluginService.instance();

		const plugins: PluginData[] = [];

		for (const pluginState of Object.values(pluginStates)) {
			const pluginId = pluginState.id;
			const contentScripts = pluginState.contentScripts[ContentScriptType.CodeMirrorPlugin] ?? [];
			const plugin = pluginService.pluginById(pluginId);

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
	}, [pluginStates]);
};

export default useCodeMirrorPlugins;
