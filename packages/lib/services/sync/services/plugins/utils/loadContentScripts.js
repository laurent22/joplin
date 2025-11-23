"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contentScriptsToRendererRules = contentScriptsToRendererRules;
exports.contentScriptsToCodeMirrorPlugin = contentScriptsToCodeMirrorPlugin;
const types_1 = require("../api/types");
const path_1 = require("@joplin/utils/path");
const shim_1 = require("../../../shim");
const Logger_1 = require("@joplin/utils/Logger");
const PluginService_1 = require("../PluginService");
const logger = Logger_1.default.create('loadContentScripts');
function postMessageHandler(pluginId, scriptType, contentScriptId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    return (message) => {
        if (scriptType === types_1.ContentScriptType.MarkdownItPlugin) {
            logger.error('context.postMessage is not available to renderer content scripts');
        }
        else {
            const plugin = PluginService_1.default.instance().pluginById(pluginId);
            return plugin.emitContentScriptMessage(contentScriptId, message);
        }
    };
}
function contentScriptsToRendererRules(plugins) {
    return loadContentScripts(plugins, types_1.ContentScriptType.MarkdownItPlugin);
}
function contentScriptsToCodeMirrorPlugin(plugins) {
    return loadContentScripts(plugins, types_1.ContentScriptType.CodeMirrorPlugin);
}
function loadContentScripts(plugins, scriptType) {
    if (!plugins)
        return null;
    const output = [];
    for (const pluginId in plugins) {
        const plugin = plugins[pluginId];
        const contentScripts = plugin.contentScripts[scriptType];
        if (!contentScripts)
            continue;
        for (const contentScript of contentScripts) {
            try {
                const module = shim_1.default.requireDynamic(contentScript.path);
                if (!module.default || typeof module.default !== 'function')
                    throw new Error(`Content script must export a function under the "default" key: Plugin: ${pluginId}: Script: ${contentScript.id}`);
                const context = {
                    pluginId,
                    contentScriptId: contentScript.id,
                    postMessage: postMessageHandler(pluginId, scriptType, contentScript.id),
                };
                const loadedModule = module.default(context);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                if (!loadedModule.plugin && !loadedModule.codeMirrorResources && !loadedModule.codeMirrorOptions)
                    throw new Error(`Content script must export a "plugin" key or a list of CodeMirror assets or define a CodeMirror option: Plugin: ${pluginId}: Script: ${contentScript.id}`);
                output.push({
                    id: contentScript.id,
                    module: loadedModule,
                    assetPath: (0, path_1.dirname)(contentScript.path),
                    pluginId,
                });
            }
            catch (error) {
                // This function must not throw as doing so would crash the
                // application, which we want to avoid for plugins. Instead log
                // the error, and continue loading the other content scripts.
                logger.error(error.message);
            }
        }
    }
    return output;
}
