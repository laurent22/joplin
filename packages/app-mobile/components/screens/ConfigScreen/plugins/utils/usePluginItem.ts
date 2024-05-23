import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import { PluginManifest } from '@joplin/lib/services/plugins/utils/types';
import { useMemo } from 'react';

const usePluginItem = (id: string, pluginSettings: PluginSettings): PluginItem => {
	const plugin = useMemo(() => {
		if (!PluginService.instance().pluginIds.includes(id)) {
			return null;
		}

		return PluginService.instance().pluginById(id);
	}, [id]);

	return useMemo(() => {
		const settings = pluginSettings[id];

		const manifest: PluginManifest|null = plugin?.manifest ?? null;
		return {
			id,
			manifest,

			installed: !!settings,
			enabled: settings?.enabled,
			deleted: settings?.deleted,
			devMode: plugin.devMode,
			builtIn: plugin.builtIn,
			hasBeenUpdated: settings?.hasBeenUpdated,
		};
	}, [plugin, id, pluginSettings]);
};

export default usePluginItem;
