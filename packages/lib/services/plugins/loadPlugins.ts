import Setting from '../../models/Setting';
import BasePluginRunner from '../plugins/BasePluginRunner';
import PluginService, { PluginSettings } from '../../services/plugins/PluginService';
import { Store } from 'redux';
import Logger from '@joplin/utils/Logger';
import shim from '../../shim';
import { State as AppState } from '../../reducer';
import BasePlatformImplementation from './BasePlatformImplementation';

const logger = Logger.create('loadPlugins');

type CancelEvent = { cancelled: boolean };

export interface Props {
	pluginRunner: BasePluginRunner;
	pluginSettings: PluginSettings;
	platformImplementation: BasePlatformImplementation;
	store: Store<AppState>;
	reloadAll: boolean;
	cancelEvent: CancelEvent;
}

const loadPlugins = async ({
	pluginRunner,
	platformImplementation,
	pluginSettings,
	store,
	reloadAll,
	cancelEvent,
}: Props) => {
	try {
		const pluginService = PluginService.instance();
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

		await pluginService.loadAndRunDevPlugins(pluginSettings);

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
