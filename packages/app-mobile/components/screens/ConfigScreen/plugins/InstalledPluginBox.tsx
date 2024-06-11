import * as React from 'react';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import { useMemo } from 'react';
import PluginBox from './PluginBox';
import useUpdateState from './utils/useUpdateState';
import { PluginCallback, PluginCallbacks } from './utils/usePluginCallbacks';
import usePluginItem from './utils/usePluginItem';
import { PluginStatusRecord } from '../types';

interface Props {
	themeId: number;

	pluginId: string;
	pluginSettings: PluginSettings;
	updatablePluginIds: PluginStatusRecord;
	updatingPluginIds: PluginStatusRecord;
	showInstalledChip: boolean;

	callbacks: PluginCallbacks;
	onShowPluginInfo: PluginCallback;
}

const InstalledPluginBox: React.FC<Props> = props => {
	const pluginId = props.pluginId;
	const updateState = useUpdateState({
		pluginId,
		updatablePluginIds: props.updatablePluginIds,
		updatingPluginIds: props.updatingPluginIds,
		pluginSettings: props.pluginSettings,
	});
	const pluginItem = usePluginItem(pluginId, props.pluginSettings, null);

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
			showInstalledChip={props.showInstalledChip}
			onShowPluginLog={props.callbacks.onShowPluginLog}
			onShowPluginInfo={props.onShowPluginInfo}
			updateState={updateState}
		/>
	);
};

export default InstalledPluginBox;
