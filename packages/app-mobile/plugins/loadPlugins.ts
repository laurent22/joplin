
// import PluginService from '@joplin/lib/services/plugins/PluginService';
// import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
import BasePluginRunner from '@joplin/lib/services/plugins/BasePluginRunner';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import { Asset } from 'expo-asset';
import PlatformImplementation from './PlatformImplementation';
import { Store } from 'redux';
import Logger from '@joplin/utils/Logger';
import shim from '@joplin/lib/shim';

const defaultPlugins: Record<string, string|number> = {
	'com.example.codemirror6-line-numbers': require('./sources/com.example.codemirror6-line-numbers.jpl'),
	'org.joplinapp.plugins.TocDemo': require('./sources/org.joplinapp.plugins.TocDemo.jpl'),
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
			logger.info(`Copying plugin with ID ${pluginId}`);

			const pluginAsset = Asset.fromModule(defaultPlugins[pluginId]);

			// Note: downloadAsync is documented to only download the file if an up-to-date
			// local copy is not already present.
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

		if (Setting.value('env') === 'dev') {
			logger.info('Running dev plugins (if any)...');
			await pluginService.loadAndRunDevPlugins(pluginSettings);
		}

		if (cancel.cancelled) {
			return;
		}

		if (await shim.fsDriver().exists(Setting.value('pluginDir'))) {
			logger.info('Running user-installed plugins...');
			await pluginService.loadAndRunPlugins(Setting.value('pluginDir'), pluginSettings);
		}

		if (cancel.cancelled) {
			return;
		}

		if (pluginPaths.length > 0) {
			logger.info('Running built-in plugins...');
			const options = { devMode: false, builtIn: true };
			await pluginService.loadAndRunPlugins(pluginPaths, pluginSettings, options);
		}
	} catch (error) {
		console.error(error);
		throw error;
	}
};

export default loadPlugins;
