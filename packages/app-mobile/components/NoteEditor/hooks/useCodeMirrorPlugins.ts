import { PluginData } from '@joplin/editor/types';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import { ContentScriptType } from '@joplin/lib/services/plugins/api/types';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
import { useMemo } from 'react';

const logger = Logger.create('useCodeMirrorPlugins');

const useCodeMirrorPlugins = (pluginStates: PluginStates) => {
	return useMemo(() => {
		const pluginService = PluginService.instance();

		const plugins: PluginData[] = [];

		logger.debug('Loading CodeMirror content scripts...', pluginStates);

		for (const pluginState of Object.values(pluginStates)) {
			const pluginId = pluginState.id;
			const contentScripts = pluginState.contentScripts[ContentScriptType.CodeMirrorPlugin] ?? [];

			if (!pluginService.plugins[pluginId]) {
				// This can happen just after uninstalling a plugin -- the pluginState still exists but the plugin
				// isn't regisered with the PluginService.
				logger.warn(`Plugin ${pluginId} not loaded but is present in contentScripts.`);
				continue;
			}

			const plugin = pluginService.pluginById(pluginId);
			logger.debug(`Loading content scripts for plugin ${pluginId}...`);

			for (const contentScript of contentScripts) {
				const contentScriptId = contentScript.id;
				plugins.push({
					pluginId,
					contentScriptId,
					contentScriptJs: async () => {
						return await shim.fsDriver().readFile(contentScript.path);
					},
					postMessageHandler: async (message: any): Promise<any> => {
						logger.debug(`Got message from plugin ${pluginId} content script ${contentScriptId}. Message:`, message);
						return plugin.emitContentScriptMessage(contentScriptId, message);
					},
				});
			}
		}

		return plugins;
	}, [pluginStates]);
};

export default useCodeMirrorPlugins;
