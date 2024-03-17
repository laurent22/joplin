import PluginService from '@joplin/lib/services/plugins/PluginService';
import { useMemo } from 'react';

const usePlugin = (pluginId: string) => {
	return useMemo(() => {
		return PluginService.instance().pluginById(pluginId);
	}, [pluginId]);
};

export default usePlugin;
