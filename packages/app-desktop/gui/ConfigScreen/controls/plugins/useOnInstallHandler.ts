import { useCallback } from 'react';
import PluginService, { defaultPluginSetting, PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import produce from 'immer';
import { _ } from '@joplin/lib/locale';
import Logger from '@joplin/lib/Logger';
import { ItemEvent } from './PluginBox';

const logger = Logger.create('useOnInstallHandler');

export interface OnPluginSettingChangeEvent {
	value: PluginSettings;
}

type OnPluginSettingChangeHandler = (event: OnPluginSettingChangeEvent)=> void;

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
export default function(setInstallingPluginIds: Function, pluginSettings: PluginSettings, repoApi: Function, onPluginSettingsChange: OnPluginSettingChangeHandler, isUpdate: boolean) {
	return useCallback(async (event: ItemEvent) => {
		const pluginId = event.item.manifest.id;

		setInstallingPluginIds((prev: any) => {
			return {
				...prev, [pluginId]: true,
			};
		});

		let installError = null;

		try {
			if (isUpdate) {
				await PluginService.instance().updatePluginFromRepo(repoApi(), pluginId);
			} else {
				await PluginService.instance().installPluginFromRepo(repoApi(), pluginId);
			}
		} catch (error) {
			installError = error;
			logger.error(error);
		}

		if (!installError) {
			const newSettings = produce(pluginSettings, (draft: PluginSettings) => {
				draft[pluginId] = defaultPluginSetting();
				if (isUpdate) {
					if (pluginSettings[pluginId]) {
						draft[pluginId].enabled = pluginSettings[pluginId].enabled;
					}
					draft[pluginId].hasBeenUpdated = true;
				}
			});

			onPluginSettingsChange({ value: newSettings });
		}

		setInstallingPluginIds((prev: any) => {
			return {
				...prev, [pluginId]: false,
			};
		});

		if (installError) alert(_('Could not install plugin: %s', installError.message));
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [pluginSettings, onPluginSettingsChange]);
}
