
// import PluginService from '@joplin/lib/services/plugins/PluginService';
// import shim from '@joplin/lib/shim';
import { Asset } from 'expo-asset';


const defaultPlugins: Record<string, string|number> = {
	'io.github.personalizedrefrigerator.joplinvimrc': require('./sources/io.github.personalizedrefrigerator.joplin-vimrc.jpl'),
};

const loadPlugins = async () => {
	try {
	//	const pluginService = PluginService.instance();
		for (const pluginId in defaultPlugins) {
			const pluginAsset = Asset.fromModule(defaultPlugins[pluginId]);
			await pluginAsset.downloadAsync();

			const assetFilePath = pluginAsset.localUri.replace(/^file:[/][/]/, '');
			console.log('Downloaded to', assetFilePath);
			// shim.fsDriver().readFile(url.fileURLToPath(pluginAsset.localUri));
		}
	} catch (error) {
		console.error(error);
		throw error;
	}
};

export default loadPlugins;
