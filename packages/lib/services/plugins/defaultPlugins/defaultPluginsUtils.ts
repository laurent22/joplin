import produce from 'immer';
import path = require('path');
import Setting from '../../../models/Setting';
import shim from '../../../shim';
import PluginService, { defaultPluginSetting, DefaultPluginsInfo, PluginSettings } from '../PluginService';
import * as React from 'react';
const shared = require('@joplin/lib/components/shared/config-shared.js');

export function checkPreInstalledDefaultPlugins(defaultPluginsId: string[],pluginSettings: PluginSettings) {
	const installedDefaultPlugins: Array<string> = Setting.value('installedDefaultPlugins');
	for (const pluginId of defaultPluginsId) {
		// if pluginId is present in pluginSettings and not in installedDefaultPlugins array,
		// then its either pre-installed by user or just uninstalled
		if (pluginSettings[pluginId] && !installedDefaultPlugins.includes(pluginId)) Setting.setArrayValue('installedDefaultPlugins', pluginId);
	}
}

export async function installDefaultPlugins(service: PluginService, pluginsDir: string, defaultPluginsId: string[], pluginSettings: PluginSettings): Promise<PluginSettings> {
	if (!await shim.fsDriver().exists(pluginsDir)) return pluginSettings;
	const defaultPluginsPaths = await shim.fsDriver().readDirStats(pluginsDir);
	if (defaultPluginsPaths.length <= 0) return pluginSettings;

	const installedPlugins = Setting.value('installedDefaultPlugins');

	for (let pluginId of defaultPluginsPaths) {
		pluginId = pluginId.path;

		// if pluginId is present in 'installedDefaultPlugins' array or it doesn't have default plugin ID, then we won't install it again as default plugin
		if (installedPlugins.includes(pluginId) || !defaultPluginsId.includes(pluginId)) continue;
		const defaultPluginPath: string = path.join(pluginsDir, pluginId, 'plugin.jpl');
		await service.installPlugin(defaultPluginPath, false);

		pluginSettings = produce(pluginSettings, (draft: PluginSettings) => {
			draft[pluginId] = defaultPluginSetting();
		});
	}
	return pluginSettings;
}

export function setSettingsForDefaultPlugins(defaultPluginsInfo: DefaultPluginsInfo) {
	const installedDefaultPlugins = Setting.value('installedDefaultPlugins');

	// only set initial settings if the plugin is not present in installedDefaultPlugins array
	for (const pluginId of Object.keys(defaultPluginsInfo)) {
		if (!defaultPluginsInfo[pluginId].settings) continue;
		for (const settingName of Object.keys(defaultPluginsInfo[pluginId].settings)) {
			if (!installedDefaultPlugins.includes(pluginId) && Setting.keyExists(`plugin-${pluginId}.${settingName}`)) {
				Setting.setValue(`plugin-${pluginId}.${settingName}`, defaultPluginsInfo[pluginId].settings[settingName]);
			}
		}
	}
}

export function getDefaultPluginsInstallState(service: PluginService, defaultPluginsId: string[]): PluginSettings {
	const settings: PluginSettings = {};
	for (const pluginId of defaultPluginsId) {
		if (!service.pluginIds.includes(pluginId)) continue;
		if (!Setting.setArrayValue('installedDefaultPlugins', pluginId)) {
			settings[pluginId] = defaultPluginSetting();
		}
	}
	return settings;
}

export function updateDefaultPluginsInstallState(newPluginStates: PluginSettings, ConfigScreen: React.Component<any, any>) {
	if (Object.keys(newPluginStates).length === 0) return;
	const key = 'plugins.states';
	const md = Setting.settingMetadata(key);
	let newValue = Setting.value('plugins.states');
	newValue = {
		...newValue, ...newPluginStates,
	};
	shared.updateSettingValue(ConfigScreen, key, newValue);

	if (md.autoSave) {
		shared.scheduleSaveSettings(ConfigScreen);
	}
}
