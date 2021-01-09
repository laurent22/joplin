import { useCallback } from 'react';
import PluginService, { defaultPluginSetting, PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import produce from 'immer';
import { _ } from '@joplin/lib/locale';
import Logger from '@joplin/lib/Logger';

const logger = Logger.create('useOnInstallHandler');

export default function(setInstallingPluginIds: Function, pluginSettings: PluginSettings, repoApi: Function, onPluginSettingsChange: Function) {
	return useCallback(async (event: any) => {
		const pluginId = event.item.id;

		setInstallingPluginIds((prev: any) => {
			return {
				...prev, [pluginId]: true,
			};
		});

		let installError = null;

		try {
			await PluginService.instance().installPluginFromRepo(repoApi(), pluginId);
		} catch (error) {
			installError = error;
			logger.error(error);
		}

		if (!installError) {
			const newSettings = produce(pluginSettings, (draft: PluginSettings) => {
				draft[pluginId] = defaultPluginSetting();
			});

			onPluginSettingsChange({ value: newSettings });
		}

		setInstallingPluginIds((prev: any) => {
			return {
				...prev, [pluginId]: false,
			};
		});

		if (installError) alert(_('Could not install plugin: %s', installError.message));
	}, [pluginSettings, onPluginSettingsChange]);
}
