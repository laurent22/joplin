import { _ } from '../../../../locale';
import PluginService, { PluginSettings, defaultPluginSetting } from '../../../../services/plugins/PluginService';
import shim from '../../../../shim';
import produce from 'immer';
import { ItemEvent, OnPluginSettingChangeHandler } from './types';
import Setting from '../../../../models/Setting';

const useOnDeleteHandler = (
	pluginSettings: PluginSettings,
	onSettingsChange: OnPluginSettingChangeHandler,
	deleteNow: boolean,
) => {
	const React = shim.react();
	return React.useCallback(async (event: ItemEvent) => {
		const item = event.item;
		const confirmed = await shim.showConfirmationDialog(_('Delete plugin "%s"?', item.manifest.name));
		if (!confirmed) return;

		const newSettings = produce(pluginSettings, (draft: PluginSettings) => {
			if (!draft[item.manifest.id]) draft[item.manifest.id] = defaultPluginSetting();
			draft[item.manifest.id].deleted = true;
		});

		onSettingsChange({ value: newSettings });

		if (deleteNow) {
			const pluginService = PluginService.instance();

			// We first unload the plugin. This is done here rather than in pluginService.uninstallPlugins
			// because unloadPlugin may not work on desktop.
			const plugin = pluginService.plugins[item.manifest.id];
			if (plugin) {
				await pluginService.unloadPlugin(item.manifest.id);
			}

			const updatedSettings = pluginService.clearUpdateState(
				await pluginService.uninstallPlugins(newSettings),
			);
			Setting.setValue(
				'plugins.states',
				pluginService.serializePluginSettings(updatedSettings),
			);
		}
	}, [pluginSettings, onSettingsChange, deleteNow]);
};

export default useOnDeleteHandler;
