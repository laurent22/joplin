import { PluginStates, utils as pluginUtils } from '@joplin/lib/services/plugins/reducer';
import { useMemo } from 'react';

const useViewInfos = (pluginStates: PluginStates) => {
	return useMemo(() => {
		return pluginUtils.viewInfosByType(pluginStates, 'webview');
	}, [pluginStates]);
};

export default useViewInfos;
