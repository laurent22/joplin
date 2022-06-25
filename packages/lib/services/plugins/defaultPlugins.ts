import { defaultPluginSetting, PluginSettings } from './PluginService';

const defaultPluginsId = ['io.github.jackgruber.backup', 'plugin.calebjohn.rich-markdown'];

export default function getDefaultPluginSettings(): PluginSettings {
	const settings: PluginSettings = {};
	defaultPluginsId.map((pluginId: string) => {
		settings[pluginId] = defaultPluginSetting();
	});
	return settings;
}
