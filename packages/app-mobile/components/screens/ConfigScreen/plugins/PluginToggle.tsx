
import * as React from 'react';
import { ConfigScreenStyles } from '../configScreenStyles';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import { useMemo } from 'react';
import PluginBox from './PluginBox';
import RepositoryApi from '@joplin/lib/services/plugins/RepositoryApi';
import useUpdateState from './utils/useUpdateState';
import { PluginCallback, PluginCallbacks } from './utils/usePluginCallbacks';
import usePluginItem from './utils/usePluginItem';

interface Props {
	pluginId: string;
	themeId: number;
	styles: ConfigScreenStyles;
	pluginSettings: PluginSettings;
	updatablePluginIds: Record<string, boolean>;
	updatingPluginIds: Record<string, boolean>;
	repoApi: RepositoryApi;

	callbacks: PluginCallbacks;
	onShowPluginInfo: PluginCallback;
	updatePluginStates: (settingValue: PluginSettings)=> void;
}

const PluginToggle: React.FC<Props> = props => {
	const pluginId = props.pluginId;
	const updateState = useUpdateState({
		pluginId,
		updatablePluginIds: props.updatablePluginIds,
		updatingPluginIds: props.updatingPluginIds,
		pluginSettings: props.pluginSettings,
	});
	const pluginItem = usePluginItem(pluginId, props.pluginSettings);

	const plugin = useMemo(() => PluginService.instance().pluginById(pluginId), [pluginId]);
	const isCompatible = useMemo(() => {
		return PluginService.instance().isCompatible(plugin.manifest);
	}, [plugin]);

	return (
		<PluginBox
			themeId={props.themeId}
			item={pluginItem}
			isCompatible={isCompatible}
			hasErrors={plugin.hasErrors}
			onShowPluginLog={props.callbacks.onShowPluginLog}
			onShowPluginInfo={props.onShowPluginInfo}
			updateState={updateState}
		/>
	);
};

export default PluginToggle;
