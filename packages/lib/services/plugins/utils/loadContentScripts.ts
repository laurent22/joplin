import { PluginStates } from '../reducer';
import { ContentScriptType, ContentScriptContext, PostMessageHandler } from '../api/types';
import { dirname } from '@joplin/renderer/pathUtils';
import shim from '../../../shim';
import Logger from '@joplin/utils/Logger';
import PluginService from '../PluginService';

const logger = Logger.create('loadContentScripts');

export interface ExtraContentScript {
	id: string;
	module: any;
	assetPath: string;
}

function postMessageHandler(pluginId: string, scriptType: ContentScriptType, contentScriptId: string): PostMessageHandler {
	return (message: any) => {
		if (scriptType === ContentScriptType.MarkdownItPlugin) {
			logger.error('context.postMessage is not available to renderer content scripts');
		} else {
			const plugin = PluginService.instance().pluginById(pluginId);
			return plugin.emitContentScriptMessage(contentScriptId, message);
		}
	};
}

export function contentScriptsToRendererRules(plugins: PluginStates): ExtraContentScript[] {
	return loadContentScripts(plugins, ContentScriptType.MarkdownItPlugin);
}

export function contentScriptsToCodeMirrorPlugin(plugins: PluginStates): ExtraContentScript[] {
	return loadContentScripts(plugins, ContentScriptType.CodeMirrorPlugin);
}

function loadContentScripts(plugins: PluginStates, scriptType: ContentScriptType): ExtraContentScript[] {
	if (!plugins) return null;

	const output: ExtraContentScript[] = [];

	for (const pluginId in plugins) {
		const plugin = plugins[pluginId];
		const contentScripts = plugin.contentScripts[scriptType];
		if (!contentScripts) continue;

		for (const contentScript of contentScripts) {
			try {
				const module = shim.requireDynamic(contentScript.path);
				if (!module.default || typeof module.default !== 'function') throw new Error(`Content script must export a function under the "default" key: Plugin: ${pluginId}: Script: ${contentScript.id}`);

				const context: ContentScriptContext = {
					pluginId,
					contentScriptId: contentScript.id,
					postMessage: postMessageHandler(pluginId, scriptType, contentScript.id),
				};

				const loadedModule = module.default(context);

				if (!loadedModule.plugin && !loadedModule.codeMirrorResources && !loadedModule.codeMirrorOptions) throw new Error(`Content script must export a "plugin" key or a list of CodeMirror assets or define a CodeMirror option: Plugin: ${pluginId}: Script: ${contentScript.id}`);

				output.push({
					id: contentScript.id,
					module: loadedModule,
					assetPath: dirname(contentScript.path),
				});
			} catch (error) {
				// This function must not throw as doing so would crash the
				// application, which we want to avoid for plugins. Instead log
				// the error, and continue loading the other content scripts.
				logger.error(error.message);
			}
		}
	}

	return output;
}
