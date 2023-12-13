import produce from 'immer';
import Setting from '../../../models/Setting';
import shim from '../../../shim';
import PluginService, { defaultPluginSetting, DefaultPluginsInfo, PluginSettings } from '../PluginService';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('defaultPluginsUtils');

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

export function afterDefaultPluginsLoaded(defaultPluginsInfo: DefaultPluginsInfo, pluginSettings: PluginSettings) {
	const installedDefaultPlugins: string[] = Setting.value('installedDefaultPlugins');
	const allDefaultPlugins = Object.keys(defaultPluginsInfo);

	for (const pluginId of allDefaultPlugins) {
		// if pluginId is present in pluginSettings and not in installedDefaultPlugins array,
		// then it's a new default plugin and needs overrides applied.
		if (pluginSettings[pluginId] && !installedDefaultPlugins.includes(pluginId)) {
			// Postprocess: Apply setting overrides
			for (const settingName of Object.keys(defaultPluginsInfo[pluginId].settings ?? {})) {
				if (!installedDefaultPlugins.includes(pluginId) && Setting.keyExists(`plugin-${pluginId}.${settingName}`)) {
					Setting.setValue(`plugin-${pluginId}.${settingName}`, defaultPluginsInfo[pluginId].settings[settingName]);
				}
			}

			// Mark the plugin as installed so that postprocessing won't be done again.
			Setting.setArrayValue('installedDefaultPlugins', pluginId);
		}
	}
}
