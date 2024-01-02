
//import PluginService from '@joplin/lib/services/plugins/PluginService';

const defaultPlugins = {
	'io.github.personalizedrefrigerator.joplinvimrc': require('./sources/io.github.personalizedrefrigerator.joplinvimrc.jpl'),
};

const loadPlugins = () => {
//	const pluginService = PluginService.instance();
	console.log(defaultPlugins);
};

