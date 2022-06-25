import shim from '@joplin/lib/shim';
import PluginService, { defaultPluginSetting, PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import path = require('path');
import { filename } from '@joplin/lib/path-utils';
import produce from 'immer';
import Setting from '@joplin/lib/models/Setting';

export default async function installDefaultPlugins(pluginSettings: PluginSettings, service: PluginService): Promise<PluginSettings> {
	if (!Setting.value('firstStart')) return pluginSettings;
	const defaultPlugins = await shim.fsDriver().readDirStats(path.join(__dirname, '..', 'app-desktop/build/defaultPlugins/'));
	for (const plugin of defaultPlugins) {
		const defaultPluginPath: string = path.join(__dirname, '..', `app-desktop/build/defaultPlugins/${plugin.path}`);
		await service.installPlugin(defaultPluginPath, false);

		pluginSettings = produce(pluginSettings, (draft: PluginSettings) => {
			draft[filename(plugin.path)] = defaultPluginSetting();
		});
	}
	return pluginSettings;
}
