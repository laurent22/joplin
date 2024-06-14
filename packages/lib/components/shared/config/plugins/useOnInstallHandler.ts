import produce from 'immer';
import Logger from '@joplin/utils/Logger';
import { ItemEvent, OnPluginSettingChangeHandler } from './types';
import type * as React from 'react';
import shim from '../../../../shim';
import RepositoryApi from '../../../../services/plugins/RepositoryApi';
import PluginService, { PluginSettings, defaultPluginSetting } from '../../../../services/plugins/PluginService';
import { _ } from '../../../../locale';

const logger = Logger.create('useOnInstallHandler');

type GetRepoApiCallback = ()=> RepositoryApi;

const useOnInstallHandler = (
	setInstallingPluginIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
	pluginSettingsRef: React.RefObject<PluginSettings>,
	getRepoApi: GetRepoApiCallback|RepositoryApi,
	onPluginSettingsChange: OnPluginSettingChangeHandler,
	isUpdate: boolean,
) => {
	const React = shim.react();
	return React.useCallback(async (event: ItemEvent) => {
		const pluginId = event.item.manifest.id;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		setInstallingPluginIds((prev: any) => {
			return {
				...prev, [pluginId]: true,
			};
		});

		let installError = null;

		try {
			const repoApi = typeof getRepoApi === 'function' ? getRepoApi() : getRepoApi;

			if (isUpdate) {
				await PluginService.instance().updatePluginFromRepo(repoApi, pluginId);
			} else {
				await PluginService.instance().installPluginFromRepo(repoApi, pluginId);
			}
		} catch (error) {
			installError = error;
			logger.error(error);
		}

		if (!installError) {
			const pluginSettings = pluginSettingsRef.current;
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

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		setInstallingPluginIds((prev: any) => {
			return {
				...prev, [pluginId]: false,
			};
		});

		if (installError) {
			await shim.showMessageBox(
				_('Could not install plugin: %s', installError.message),
				{ buttons: [_('OK')] },
			);
		}
	}, [getRepoApi, isUpdate, pluginSettingsRef, onPluginSettingsChange, setInstallingPluginIds]);
};

export default useOnInstallHandler;
