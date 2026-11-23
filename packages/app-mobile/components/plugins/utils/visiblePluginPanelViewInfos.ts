import { PluginStates, utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import { SerializedPluginSettings } from '@joplin/lib/services/plugins/PluginService';
import { ContainerType } from '@joplin/lib/services/plugins/WebviewController';

export const pluginHasPanelView = (pluginStates: PluginStates, pluginId: string) => {
	return Object.values(pluginStates[pluginId]?.views ?? {}).some(view => view.type === 'webview' && view.containerType === ContainerType.Panel);
};

const visiblePluginPanelViewInfos = (pluginStates: PluginStates, pluginSettings: SerializedPluginSettings) => {
	return pluginUtils.viewInfosByType(pluginStates, 'webview').filter(({ plugin, view }) => {
		return view.containerType === ContainerType.Panel && view.opened && pluginSettings[plugin.id]?.pluginPanelEnabled !== false;
	});
};

export default visiblePluginPanelViewInfos;
