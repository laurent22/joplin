import PluginService from '../services/plugins/PluginService';
import Logger from '@joplin/utils/Logger';
import shim from '../shim';

const logger = Logger.create('usePlugin');

const usePlugin = (pluginId: string) => {
	const React = shim.react();
	const [pluginReloadCounter, setPluginReloadCounter] = React.useState(0);

	const plugin = React.useMemo(() => {
		if (!PluginService.instance().pluginIds.includes(pluginId)) {
			return null;
		}

		if (pluginReloadCounter > 0) {
			logger.debug('Reloading plugin', pluginId, 'because the set of loaded plugins changed.');
		}

		return PluginService.instance().pluginById(pluginId);
		// The dependency on pluginReloadCounter is important -- it ensures that the plugin
		// matches the one loaded in the PluginService.
	}, [pluginId, pluginReloadCounter]);

	const reloadCounterRef = React.useRef(0);
	reloadCounterRef.current = pluginReloadCounter;

	// The plugin may need to be re-fetched from the PluginService. When a plugin is reloaded,
	// its Plugin object is replaced with a new one.
	React.useEffect(() => {
		const { remove } = PluginService.instance().addLoadedPluginsChangeListener(() => {
			setPluginReloadCounter(reloadCounterRef.current + 1);
		});

		return () => {
			remove();
		};
	}, []);

	return plugin;
};

export default usePlugin;
