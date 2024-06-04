import Setting from '@joplin/lib/models/Setting';
import BasePluginRunner from '@joplin/lib/services/plugins/BasePluginRunner';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import PlatformImplementation from './PlatformImplementation';
import { Store } from 'redux';
import Logger from '@joplin/utils/Logger';
import shim from '@joplin/lib/shim';
import { AppState } from '../utils/types';

const logger = Logger.create('loadPlugins');

type CancelEvent = { cancelled: boolean };

export interface Props {
	pluginRunner: BasePluginRunner;
	pluginSettings: PluginSettings;
	store: Store<AppState>;
	reloadAll: boolean;
	cancelEvent: CancelEvent;
}

const loadPlugins = async ({ pluginRunner, pluginSettings, store, reloadAll, cancelEvent }: Props) => {
	try {
		const pluginService = PluginService.instance();
		const platformImplementation = PlatformImplementation.instance();
		pluginService.initialize(
			platformImplementation.versionInfo.version, platformImplementation, pluginRunner, store,
		);
		pluginService.isSafeMode = Setting.value('isSafeMode');

		if (reloadAll) {
			logger.info('Reloading all plugins.');
		}

		for (const pluginId of pluginService.pluginIds) {
			if (reloadAll || (pluginSettings[pluginId] && !pluginSettings[pluginId].enabled)) {
				logger.info('Unloading plugin', pluginId);
				await pluginService.unloadPlugin(pluginId);
			}

			if (cancelEvent.cancelled) {
				logger.info('Cancelled.');
				return;
			}
		}

		if (Setting.value('env') === 'dev') {
			logger.info('Running dev plugins (if any)...');
			await pluginService.loadAndRunDevPlugins(pluginSettings);
		}

		if (cancelEvent.cancelled) {
			logger.info('Cancelled.');
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
