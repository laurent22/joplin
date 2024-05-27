import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import PluginService, { PluginSettings } from '@joplin/lib/services/plugins/PluginService';
import { PluginManifest } from '@joplin/lib/services/plugins/utils/types';
import { useMemo, useRef } from 'react';

// initialItem is used when the plugin is not installed. For example, if the plugin item is being
// created from search results.
const usePluginItem = (id: string, pluginSettings: PluginSettings, initialItem: PluginItem|null): PluginItem => {
	const plugin = useMemo(() => {
		if (!PluginService.instance().pluginIds.includes(id)) {
			return null;
		}

		return PluginService.instance().pluginById(id);
	}, [id]);

	const lastManifest = useRef<PluginManifest>();
	if (plugin) {
		lastManifest.current = plugin.manifest;
	} else if (!lastManifest.current) {
		lastManifest.current = initialItem?.manifest;
	}
	const manifest = lastManifest.current;

	return useMemo(() => {
		if (!manifest) return null;
		const settings = pluginSettings[id];

		return {
			id,
			manifest,

			installed: !!settings,
			enabled: settings?.enabled ?? false,
			deleted: settings?.deleted ?? false,
			hasBeenUpdated: settings?.hasBeenUpdated ?? false,
			devMode: plugin?.devMode ?? false,
			builtIn: plugin?.builtIn ?? false,
		};
	}, [plugin, id, pluginSettings, manifest]);
};

export default usePluginItem;
