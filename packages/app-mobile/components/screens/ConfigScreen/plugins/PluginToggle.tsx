
import * as React from 'react';
import { View, Text, Switch } from 'react-native';
import { ConfigScreenStyles } from '../configScreenStyles';
import PluginService, { defaultPluginSetting } from '@joplin/lib/services/plugins/PluginService';
import { useCallback, useMemo } from 'react';

interface Props {
	pluginId: string;
	styles: ConfigScreenStyles;
	pluginSettings: string;

	updatePluginStates: (settingValue: any)=> void;
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

		props.updatePluginStates(
			pluginService.serializePluginSettings(newSettings),
		);
	}, [pluginService, pluginSettings, props.pluginId, props.updatePluginStates]);

	return (
		<View style={props.styles.getContainerStyle(false)}>
			<Text style={props.styles.styleSheet.switchSettingText}>
				{plugin.manifest.name}
			</Text>
			<Switch
				key="control"
				style={props.styles.styleSheet.switchSettingControl}
				value={pluginSettings[plugin.manifest.id].enabled}
				onValueChange={updatePluginEnabled}
			/>
		</View>
	);
};

export default PluginToggle;
