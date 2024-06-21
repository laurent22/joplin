import { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import { useMemo } from 'react';

export enum UpdateState {
	Idle = 1,
	CanUpdate = 2,
	Updating = 3,
	HasBeenUpdated = 4,
}

interface Props {
	pluginId: string;

	pluginSettings: PluginSettings;
	updatingPluginIds: Record<string, boolean>;
	updatablePluginIds: Record<string, boolean>;
}

const useUpdateState = ({ pluginId, pluginSettings, updatablePluginIds, updatingPluginIds }: Props) => {
	return useMemo(() => {
		const settings = pluginSettings[pluginId];

		// Uninstalled
		if (!settings) return UpdateState.Idle;

		if (settings.hasBeenUpdated) {
			return UpdateState.HasBeenUpdated;
		}
		if (updatingPluginIds[pluginId]) {
			return UpdateState.Updating;
		}
		if (updatablePluginIds[pluginId]) {
			return UpdateState.CanUpdate;
		}
		return UpdateState.Idle;
	}, [pluginSettings, updatingPluginIds, pluginId, updatablePluginIds]);
};

export default useUpdateState;
