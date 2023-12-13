import produce from 'immer';
import Setting from '../../../models/Setting';
import shim from '../../../shim';
import PluginService, { defaultPluginSetting, DefaultPluginsInfo, PluginSettings } from '../PluginService';
import Logger from '@joplin/utils/Logger';
import * as React from 'react';
const shared = require('../../../components/shared/config/config-shared.js');

const logger = Logger.create('defaultPluginsUtils');

export function checkPreInstalledDefaultPlugins(defaultPluginsId: string[], pluginSettings: PluginSettings) {
	const installedDefaultPlugins: string[] = Setting.value('installedDefaultPlugins');
	for (const pluginId of defaultPluginsId) {
		// if pluginId is present in pluginSettings and not in installedDefaultPlugins array,
		// then its either pre-installed by user or just uninstalled
		if (pluginSettings[pluginId] && !installedDefaultPlugins.includes(pluginId)) Setting.setArrayValue('installedDefaultPlugins', pluginId);
	}
}

export async function loadAndRunDefaultPlugins(
	service: PluginService, defaultPluginsDir: string, pluginSettings: PluginSettings,
): Promise<PluginSettings> {
	if (!await shim.fsDriver().exists(defaultPluginsDir)) {
		logger.info(`Could not find default plugins' directory: ${defaultPluginsDir} - skipping installation.`);
		return pluginSettings;
	}
	const defaultPluginsPaths = await shim.fsDriver().readDirStats(defaultPluginsDir);
	if (defaultPluginsPaths.length <= 0) {
		logger.info(`Default plugins' directory is empty: ${defaultPluginsDir} - skipping installation.`);
		return pluginSettings;
	}

	pluginSettings = produce(pluginSettings, (draft: PluginSettings) => {
		for (const pluginStat of defaultPluginsPaths) {
			// Each plugin should be named pluginIdHere.jpl
			const pluginFileName = pluginStat.path;
			const pluginIdMatch = pluginFileName.match(/^(.+)\.jpl$/);
			if (!pluginIdMatch) {
				logger.warn(`Unknown plugin file type ${pluginFileName}.`);
				continue;
			}

			const pluginId = pluginIdMatch[1];

			// Default plugins can be overridden but not uninstalled (as they're part of
			// the app bundle). When overriding and unoverriding a default plugin, the plugin's
			// state may be deleted.
			// As such, we recreate the plugin state if necessary.
			if (!draft[pluginId]) {
				draft[pluginId] = defaultPluginSetting();
			}
		}
	});

	await service.loadAndRunPlugins(defaultPluginsDir, pluginSettings);
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
