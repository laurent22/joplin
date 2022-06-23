import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import PluginService, { defaultPluginSetting, PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import path = require('path');
import produce from 'immer';

export default async function installDefaultPlugins(pluginSettings: PluginSettings, service: PluginService) {
	if (Setting.value('firstStart')) {
		const defaultPlugins = await shim.fsDriver().readDirStats(path.join(__dirname, '..', 'app-desktop/build/defaultPlugins/'));
		for (const plugin of defaultPlugins) {
			const defaultPluginPath: string = path.join(__dirname, '..', `app-desktop/build/defaultPlugins/${plugin.path}`);
			await service.installPlugin(defaultPluginPath, false);

			pluginSettings = produce(pluginSettings, (draft: PluginSettings) => {
				draft[plugin.path.replace('.jpl', '')] = defaultPluginSetting();
			});
		}
		Setting.setValue('defaultPlugins', service.serializePluginSettings(pluginSettings));
		return pluginSettings;
	} else { return null; }
}
