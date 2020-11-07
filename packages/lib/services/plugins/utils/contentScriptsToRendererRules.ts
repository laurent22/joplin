import { PluginStates } from '../reducer';
import { ExtraRendererRule } from '@joplin/renderer/MdToHtml';
import { ContentScriptType } from '../api/types';

export default function contentScriptsToRendererRules(plugins:PluginStates):ExtraRendererRule[] {
	const output:ExtraRendererRule[] = [];

	for (const pluginId in plugins) {
		const plugin = plugins[pluginId];
		const contentScripts = plugin.contentScripts[ContentScriptType.MarkdownItPlugin];
		if (!contentScripts) continue;

		for (const contentScript of contentScripts) {
			const module = require(contentScript.path);
			if (!module.default || typeof module.default !== 'function') throw new Error(`Content script must export a function under the "default" key: Plugin: ${pluginId}: Script: ${contentScript.id}`);

			const loadedModule = module.default({});
			if (!loadedModule.plugin) throw new Error(`Content script must export a "plugin" key: Plugin: ${pluginId}: Script: ${contentScript.id}`);

			output.push({
				id: contentScript.id,
				module: loadedModule,
			});
		}
	}

	return output;
}
