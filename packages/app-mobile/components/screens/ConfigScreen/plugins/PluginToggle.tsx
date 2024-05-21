
import * as React from 'react';
import { ConfigScreenStyles } from '../configScreenStyles';
import PluginService, { PluginSettings, defaultPluginSetting, SerializedPluginSettings } from '@joplin/lib/services/plugins/PluginService';
import { useMemo } from 'react';
import PluginBox from './PluginBox';
import RepositoryApi from '@joplin/lib/services/plugins/RepositoryApi';
import useUpdateState from './utils/useUpdateState';
import { PluginCallback, PluginCallbacks } from './utils/usePluginCallbacks';

interface Props {
	pluginId: string;
	themeId: number;
	styles: ConfigScreenStyles;
	pluginSettings: SerializedPluginSettings;
	updatablePluginIds: Record<string, boolean>;
	updatingPluginIds: Record<string, boolean>;
	repoApi: RepositoryApi;

	callbacks: PluginCallbacks;
	onShowPluginInfo: PluginCallback;
	onShowPluginLog: PluginCallback;
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

	const pluginId = plugin.manifest.id;
	const updateState = useUpdateState({
		pluginId,
		updatablePluginIds: props.updatablePluginIds,
		updatingPluginIds: props.updatingPluginIds,
		pluginSettings,
	});
	const pluginItem = useMemo(() => {
		const settings = pluginSettings[pluginId];
		return {
			manifest: plugin.manifest,
			enabled: settings.enabled,
			deleted: settings.deleted,
			devMode: plugin.devMode,
			builtIn: plugin.builtIn,
			hasBeenUpdated: settings.hasBeenUpdated,
		};
	}, [plugin, pluginId, pluginSettings]);

	const isCompatible = useMemo(() => {
		return PluginService.instance().isCompatible(plugin.manifest);
	}, [plugin]);

	return (
		<PluginBox
			themeId={props.themeId}
			item={pluginItem}
			showInfoButton={true}
			isCompatible={isCompatible}
			hasErrors={plugin.hasErrors}
			onShowPluginLog={props.onShowPluginLog}
			onShowPluginInfo={props.onShowPluginInfo}
			onToggle={props.callbacks.onToggle}
			onDelete={props.callbacks.onDelete}
			onUpdate={props.callbacks.onUpdate}
			updateState={updateState}
		/>
	);
};

export default PluginToggle;
