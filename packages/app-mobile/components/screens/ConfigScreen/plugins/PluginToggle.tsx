
import * as React from 'react';
import { ConfigScreenStyles } from '../configScreenStyles';
import PluginService, { PluginSettings, defaultPluginSetting } from '@joplin/lib/services/plugins/PluginService';
import { useCallback, useMemo } from 'react';
import PluginBox from './PluginBox';

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

	const updatePluginEnabled = useCallback((enabled: boolean) => {
		const newSettings = { ...pluginSettings };
		newSettings[props.pluginId].enabled = enabled;

		props.updatePluginStates(newSettings);
	}, [pluginService, pluginSettings, props.pluginId, props.updatePluginStates]);

	const onToggle = useCallback(() => {
		const settings = pluginSettings[plugin.manifest.id];
		updatePluginEnabled(!settings.enabled);
	}, [pluginSettings, updatePluginEnabled]);

	const pluginItem = useMemo(() => {
		const settings = pluginSettings[plugin.manifest.id];
		return {
			manifest: plugin.manifest,
			enabled: settings.enabled,
			deleted: settings.deleted,
		};
	}, [plugin, pluginSettings]);

	const isCompatible = useMemo(() => {
		return PluginService.instance().isCompatible(plugin.manifest.app_min_version);
	}, [plugin]);

	return (
		<PluginBox
			item={pluginItem}
			devMode={plugin.devMode}
			builtIn={plugin.builtIn}
			isCompatible={isCompatible}
			onToggle={onToggle}
		/>
	);
};

export default PluginToggle;
