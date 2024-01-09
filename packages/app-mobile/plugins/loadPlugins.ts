
// import PluginService from '@joplin/lib/services/plugins/PluginService';
// import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
import BasePluginRunner from '@joplin/lib/services/plugins/BasePluginRunner';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import { Asset } from 'expo-asset';
import PlatformImplementation from './PlatformImplementation';
import { Store } from 'redux';
import Logger from '@joplin/utils/Logger';

const defaultPlugins: Record<string, string|number> = {
	'com.example.codemirror6-line-numbers': require('./sources/com.example.codemirror6-line-numbers/plugin.jpl'),
	'org.joplinapp.plugins.RegisterCommandDemo': require('./sources/org.joplinapp.plugins.RegisterCommandDemo/plugin.jpl'),
	'org.joplinapp.plugins.DialogDemo': require('./sources/org.joplinapp.plugins.DialogDemo/plugin.jpl'),
};

const logger = Logger.create('loadPlugins');

type CancelEvent = { cancelled: boolean };

const loadPlugins = async (
	pluginRunner: BasePluginRunner, pluginSettings: PluginSettings, store: Store<any>, cancel: CancelEvent,
) => {
	try {
		const pluginService = PluginService.instance();
		const platformImplementation = PlatformImplementation.instance();
		pluginService.initialize(
			platformImplementation.versionInfo.version, platformImplementation, pluginRunner, store,
		);
		pluginService.isSafeMode = Setting.value('isSafeMode');

		const pluginPaths: string[] = [];

		for (const pluginId in defaultPlugins) {
			// TODO: Don't copy all plugins on startup (just the changed plugins)
			logger.info(`Copying plugin with ID ${pluginId}`);

			const pluginAsset = Asset.fromModule(defaultPlugins[pluginId]);
			await pluginAsset.downloadAsync();

			const assetFilePath = pluginAsset.localUri.replace(/^file:[/][/]/, '');
			pluginPaths.push(assetFilePath);

			if (cancel.cancelled) {
				return;
			}
		}

		// Unload any existing plugins (important for React Native's fast refresh)
		logger.debug('Unloading plugins...');
		for (const pluginId of pluginService.pluginIds) {
			await pluginService.unloadPlugin(pluginId);

			if (cancel.cancelled) {
				return;
			}
		}

		logger.debug('Running plugins...');
		await pluginService.loadAndRunPlugins(pluginPaths, pluginSettings);
	} catch (error) {
		console.error(error);
		throw error;
	}
};

export default loadPlugins;
