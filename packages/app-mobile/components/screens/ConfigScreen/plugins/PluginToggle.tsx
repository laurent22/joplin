
import * as React from 'react';
import { ConfigScreenStyles } from '../configScreenStyles';
import PluginService, { PluginSettings, defaultPluginSetting } from '@joplin/lib/services/plugins/PluginService';
import { useCallback, useMemo, useState } from 'react';
import PluginBox, { UpdateState } from './PluginBox';
import useOnDeleteHandler from '@joplin/lib/components/shared/config/plugins/useOnDeleteHandler';
import { OnPluginSettingChangeEvent } from '@joplin/lib/components/shared/config/plugins/types';
import useOnInstallHandler from '@joplin/lib/components/shared/config/plugins/useOnInstallHandler';
import repoApi from './utils/repoApi';

interface Props {
	pluginId: string;
	styles: ConfigScreenStyles;
	pluginSettings: string;

	updatePluginStates: (settingValue: PluginSettings)=> void;
}

const PluginToggle: React.FC<Props> = props => {
	const pluginService = useMemo(() => PluginService.instance(), []);
	const plugin = useMemo(() => {
		return pluginService.pluginById(props.pluginId);
	}, [pluginService, props.pluginId]);

	const pluginSettings = useMemo(() => {
		const settings = { ...pluginService.unserializePluginSettings(props.pluginSettings) };

		if (!settings[props.pluginId]) {
			settings[props.pluginId] = defaultPluginSetting();
		}

		return settings;
	}, [props.pluginSettings, pluginService, props.pluginId]);

	const onPluginSettingsChange = useCallback((event: OnPluginSettingChangeEvent) => {
		props.updatePluginStates(event.value);
	}, [props.updatePluginStates]);

	const updatePluginEnabled = useCallback((enabled: boolean) => {
		const newSettings = { ...pluginSettings };
		newSettings[props.pluginId].enabled = enabled;

		props.updatePluginStates(newSettings);
	}, [pluginSettings, props.pluginId, props.updatePluginStates]);

	const onToggle = useCallback(() => {
		const settings = pluginSettings[plugin.manifest.id];
		updatePluginEnabled(!settings.enabled);
	}, [pluginSettings, updatePluginEnabled, plugin]);

	const onDelete = useOnDeleteHandler(pluginSettings, onPluginSettingsChange, true);

	const [updatingPluginIds, setUpdatingPluginIds] = useState<Record<string, boolean>>({});
	const onUpdate = useOnInstallHandler(setUpdatingPluginIds, pluginSettings, repoApi, onPluginSettingsChange, true);

	const updateState = useMemo(() => {
		const settings = pluginSettings[plugin.manifest.id];

		if (settings.hasBeenUpdated) {
			return UpdateState.HasBeenUpdated;
		}
		if (updatingPluginIds[plugin.manifest.id]) {
			return UpdateState.Updating;
		}
		// TODO:
		return UpdateState.Idle;
	}, [pluginSettings, updatingPluginIds, plugin]);

	const pluginItem = useMemo(() => {
		const settings = pluginSettings[plugin.manifest.id];
		return {
			manifest: plugin.manifest,
			enabled: settings.enabled,
			deleted: settings.deleted,
			devMode: plugin.devMode,
			builtIn: plugin.builtIn,
			hasBeenUpdated: settings.hasBeenUpdated,
		};
	}, [plugin, pluginSettings]);

	const isCompatible = useMemo(() => {
		return PluginService.instance().isCompatible(plugin.manifest.app_min_version);
	}, [plugin]);

	return (
		<PluginBox
			item={pluginItem}
			isCompatible={isCompatible}
			onToggle={onToggle}
			onDelete={onDelete}
			onUpdate={onUpdate}
			updateState={updateState}
		/>
	);
};

export default PluginToggle;
