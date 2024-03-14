
import Setting from '@joplin/lib/models/Setting';
import BasePluginRunner from '@joplin/lib/services/plugins/BasePluginRunner';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import PlatformImplementation from './PlatformImplementation';
import { Store } from 'redux';
import Logger from '@joplin/utils/Logger';
import shim from '@joplin/lib/shim';

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
	} catch (error) {
		console.error(error);
		throw error;
	}
};

export default loadPlugins;
