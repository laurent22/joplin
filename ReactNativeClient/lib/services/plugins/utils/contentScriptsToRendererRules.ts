import { PluginStates } from '../reducer';
import { ExtraRendererRule } from 'lib/joplin-renderer/MdToHtml';

export default function contentScriptsToRendererRules(plugins:PluginStates):ExtraRendererRule[] {
	const output:ExtraRendererRule[] = [];

	for (const pluginId in plugins) {
		const plugin = plugins[pluginId];
		for (const scriptType in plugin.contentScripts) {
			const contentScripts = plugin.contentScripts[scriptType];
			for (const contentScript of contentScripts) {

				const loadedModule = require(contentScript.path).default;

				output.push({
					id: contentScript.id,
					module: loadedModule({}),
				});
			}
		}
	}

	return output;
}
