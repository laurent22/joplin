import { ItemEvent, OnPluginSettingChangeEvent } from '@joplin/lib/components/shared/config/plugins/types';
import useOnDeleteHandler from '@joplin/lib/components/shared/config/plugins/useOnDeleteHandler';
import useOnInstallHandler from '@joplin/lib/components/shared/config/plugins/useOnInstallHandler';
import NavService from '@joplin/lib/services/NavService';
import { PluginSettings, defaultPluginSetting } from '@joplin/lib/services/plugins/PluginService';
import RepositoryApi from '@joplin/lib/services/plugins/RepositoryApi';
import { useCallback, useMemo, useRef, useState } from 'react';

interface Props {
	updatePluginStates: (settingValue: PluginSettings)=> void;
	pluginSettings: PluginSettings;
	repoApi: RepositoryApi;
}

export type PluginCallback = (event: ItemEvent)=> void;

export interface PluginCallbacks {
	onToggle: PluginCallback;
	onUpdate: PluginCallback;
	onInstall: PluginCallback;
	onDelete: PluginCallback;
	onShowPluginLog: PluginCallback;
}

const usePluginCallbacks = (props: Props) => {
	const onPluginSettingsChange = useCallback((event: OnPluginSettingChangeEvent) => {
		props.updatePluginStates(event.value);
	}, [props.updatePluginStates]);

	const updatePluginEnabled = useCallback((pluginId: string, enabled: boolean) => {
		const newSettings = { ...props.pluginSettings };
		newSettings[pluginId] = {
			...defaultPluginSetting(),
			...newSettings[pluginId],
			enabled,
		};

		props.updatePluginStates(newSettings);
	}, [props.pluginSettings, props.updatePluginStates]);

	const onToggle = useCallback((event: ItemEvent) => {
		const pluginId = event.item.manifest.id;
		const settings = props.pluginSettings[pluginId] ?? defaultPluginSetting();
		updatePluginEnabled(pluginId, !settings.enabled);
	}, [props.pluginSettings, updatePluginEnabled]);

	const pluginSettingsRef = useRef(props.pluginSettings);
	pluginSettingsRef.current = props.pluginSettings;

	const onDelete = useOnDeleteHandler(pluginSettingsRef, onPluginSettingsChange, true);

	const [updatingPluginIds, setUpdatingPluginIds] = useState<Record<string, boolean>>({});
	const onUpdate = useOnInstallHandler(setUpdatingPluginIds, pluginSettingsRef, props.repoApi, onPluginSettingsChange, true);

	const [installingPluginIds, setInstallingPluginIds] = useState<Record<string, boolean>>({});
	const onInstall = useOnInstallHandler(
		setInstallingPluginIds, pluginSettingsRef, props.repoApi, onPluginSettingsChange, false,
	);

	const onShowPluginLog = useCallback((event: ItemEvent) => {
		const pluginId = event.item.manifest.id;
		void NavService.go('Log', { defaultFilter: pluginId });
	}, []);

	const callbacks = useMemo((): PluginCallbacks => {
		return {
			onToggle,
			onDelete,
			onUpdate,
			onInstall,
			onShowPluginLog,
		};
	}, [onToggle, onDelete, onUpdate, onInstall, onShowPluginLog]);

	return {
		callbacks,
		updatingPluginIds,
		installingPluginIds,
	};
};

export default usePluginCallbacks;
