import produce from 'immer';
import Setting from '../../../models/Setting';
import shim from '../../../shim';
import PluginService, { defaultPluginSetting, DefaultPluginsInfo, Plugins, PluginSettings } from '../PluginService';
import Logger from '@joplin/utils/Logger';
import { join } from 'path';

const logger = Logger.create('defaultPluginsUtils');


// Use loadAndRunDefaultPlugins
// Exported for testing.
export const getDefaultPluginPathsAndSettings = async (
	defaultPluginsDir: string, defaultPluginsInfo: DefaultPluginsInfo, pluginSettings: PluginSettings,
) => {
	const pluginPaths: string[] = [];

	if (!await shim.fsDriver().exists(defaultPluginsDir)) {
		logger.info(`Could not find default plugins' directory: ${defaultPluginsDir} - skipping installation.`);
		return { pluginPaths, pluginSettings };
	}

	const defaultPluginsPaths = await shim.fsDriver().readDirStats(defaultPluginsDir);
	if (defaultPluginsPaths.length <= 0) {
		logger.info(`Default plugins' directory is empty: ${defaultPluginsDir} - no default plugins will be installed.`);
	}

	for (const pluginStat of defaultPluginsPaths) {
		// Each plugin should be within a folder with the same ID as the plugin
		const pluginFolderName = pluginStat.path;
		const pluginId = pluginFolderName;

		if (!defaultPluginsInfo.hasOwnProperty(pluginId)) {
			logger.warn(`Default plugin ${pluginId} is missing in defaultPluginsInfo. Not loading.`);
			continue;
		}

		pluginPaths.push(join(defaultPluginsDir, pluginFolderName, 'plugin.jpl'));

		pluginSettings = produce(pluginSettings, (draft: PluginSettings) => {
			// Default plugins can be overridden but not uninstalled (as they're part of
			// the app bundle). When overriding and unoverriding a default plugin, the plugin's
			// state may be deleted.
			// As such, we recreate the plugin state if necessary.
			if (!draft[pluginId]) {
				draft[pluginId] = defaultPluginSetting();
			}
		});
	}

	return { pluginSettings, pluginPaths };
};

export const loadAndRunDefaultPlugins = async (
	service: PluginService,
	defaultPluginsDir: string,
	defaultPluginsInfo: DefaultPluginsInfo,
	originalPluginSettings: PluginSettings,
): Promise<PluginSettings> => {
	const { pluginPaths, pluginSettings } = await getDefaultPluginPathsAndSettings(
		defaultPluginsDir, defaultPluginsInfo, originalPluginSettings,
	) ?? { pluginPaths: [], pluginSettings: originalPluginSettings };

	await service.loadAndRunPlugins(pluginPaths, pluginSettings, { builtIn: true, devMode: false });
	return pluginSettings;
};

// Applies setting overrides and marks default plugins as installed.
// Should be called after plugins have finished loading.
export const afterDefaultPluginsLoaded = async (
	allLoadedPlugins: Plugins,
	defaultPluginsInfo: DefaultPluginsInfo,
	pluginSettings: PluginSettings,
) => {
	const installedDefaultPlugins: string[] = Setting.value('installedDefaultPlugins');
	const allDefaultPlugins = Object.keys(defaultPluginsInfo);

	const isFirstLoadOfDefaultPlugin = (pluginId: string) => {
		// Not installed?
		if (!pluginSettings[pluginId]) {
			return false;
		}

		// Not the first load
		if (installedDefaultPlugins.includes(pluginId)) {
			return false;
		}

		// Return true only if the plugin is built-in (and not a user-installed
		// copy).
		//
		// This avoids overriding existing user-set settings.
		return allLoadedPlugins[pluginId]?.builtIn ?? false;
	};

	for (const pluginId of allDefaultPlugins) {
		// if pluginId is present in pluginSettings and not in installedDefaultPlugins array,
		// then it's a new default plugin and needs overrides applied.
		if (isFirstLoadOfDefaultPlugin(pluginId)) {
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
};
