
// import PluginService from '@joplin/lib/services/plugins/PluginService';
// import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
import BasePluginRunner from '@joplin/lib/services/plugins/BasePluginRunner';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import { Asset } from 'expo-asset';
import PlatformImplementation from './PlatformImplementation';
import { Store } from 'redux';
import Logger from '@joplin/utils/Logger';

const defaultPlugins: Record<string, string|number> = {
	'com.example.show-message-box-on-startup': require('./sources/com.example.show-message-box-on-startup/plugin.jpl'),
};

const logger = Logger.create('loadPlugins');

const loadPlugins = async (pluginRunner: BasePluginRunner, store: Store<any>) => {
	try {
		const pluginService = PluginService.instance();
		const platformImplementation = PlatformImplementation.instance();
		pluginService.initialize(
			platformImplementation.versionInfo.version, platformImplementation, pluginRunner, store,
		);
		pluginService.isSafeMode = Setting.value('isSafeMode');

		const pluginPaths: string[] = [];

		for (const pluginId in defaultPlugins) {
			// TODO: Don't copy all plugins on startup (just changed)
			logger.info(`Copying plugin with ID ${pluginId}`);

			const pluginAsset = Asset.fromModule(defaultPlugins[pluginId]);
			await pluginAsset.downloadAsync();

			const assetFilePath = pluginAsset.localUri.replace(/^file:[/][/]/, '');
			pluginPaths.push(assetFilePath);
		}


		const pluginSettings = pluginService.unserializePluginSettings(Setting.value('plugins.states'));
		await pluginService.loadAndRunPlugins(pluginPaths, pluginSettings);
	} catch (error) {
		console.error(error);
		throw error;
	}
};

export default loadPlugins;
