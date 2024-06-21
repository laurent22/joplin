import { _ } from '../../../../locale';
import PluginService, { PluginSettings, defaultPluginSetting } from '../../../../services/plugins/PluginService';
import type * as React from 'react';
import shim from '../../../../shim';
import produce from 'immer';
import { ItemEvent, OnPluginSettingChangeHandler } from './types';

const useOnDeleteHandler = (
	pluginSettingsRef: React.RefObject<PluginSettings>,
	onSettingsChange: OnPluginSettingChangeHandler,
	deleteNow: boolean,
) => {
	const React = shim.react();
	return React.useCallback(async (event: ItemEvent) => {
		const item = event.item;
		const confirmed = await shim.showConfirmationDialog(_('Delete plugin "%s"?', item.manifest.name));
		if (!confirmed) return;

		if (deleteNow) {
			const pluginService = PluginService.instance();

			// We first unload the plugin. This is done here rather than in pluginService.uninstallPlugins
			// because unloadPlugin may not work on desktop.
			const plugin = pluginService.plugins[item.manifest.id];
			if (plugin) {
				await pluginService.unloadPlugin(item.manifest.id);
			}
		}

		// Important: To avoid race conditions, don't run any async code between fetching plugin
		// settings from the ref and calling onSettingsChange.
		let newSettings = pluginSettingsRef.current;
		if (deleteNow) {
			newSettings = produce(newSettings, (draft: PluginSettings) => {
				delete draft[item.manifest.id];
			});
			onSettingsChange({ value: newSettings });

			await PluginService.instance().uninstallPlugin(item.manifest.id);
		} else {
			// Setting .deleted causes the app to delete this plugin on startup.
			newSettings = produce(newSettings, (draft: PluginSettings) => {
				if (!draft[item.manifest.id]) draft[item.manifest.id] = defaultPluginSetting();
				draft[item.manifest.id].deleted = true;
			});
			onSettingsChange({ value: newSettings });
		}

	}, [pluginSettingsRef, onSettingsChange, deleteNow]);
};

export default useOnDeleteHandler;
