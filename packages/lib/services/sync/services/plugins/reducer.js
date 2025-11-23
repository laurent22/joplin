"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.utils = exports.defaultState = exports.stateRootKey = void 0;
exports.stateRootKey = 'pluginService';
exports.defaultState = {
    plugins: {},
    pluginHtmlContents: {},
    allPluginsStarted: false,
};
exports.utils = {
    // It is best to use viewsByType instead as this method creates new objects
    // which might trigger unnecessary renders even when plugin and views haven't changed.
    viewInfosByType: function (plugins, type) {
        const output = [];
        for (const pluginId in plugins) {
            const plugin = plugins[pluginId];
            for (const viewId in plugin.views) {
                const view = plugin.views[viewId];
                if (view.type !== type)
                    continue;
                output.push({
                    plugin: plugin,
                    view: view,
                });
            }
        }
        return output;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    viewsByType: function (plugins, type) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const output = [];
        for (const pluginId in plugins) {
            const plugin = plugins[pluginId];
            for (const viewId in plugin.views) {
                const view = plugin.views[viewId];
                if (view.type !== type)
                    continue;
                output.push(view);
            }
        }
        return output;
    },
    viewInfoByViewId: function (plugins, viewId) {
        for (const pluginId in plugins) {
            const plugin = plugins[pluginId];
            if (plugin.views[viewId]) {
                return {
                    plugin: plugin,
                    view: plugin.views[viewId],
                };
            }
        }
        return null;
    },
    allViewIds: function (plugins) {
        const output = [];
        for (const pluginId in plugins) {
            const plugin = plugins[pluginId];
            for (const viewId in plugin.views) {
                output.push(viewId);
            }
        }
        return output;
    },
    commandNamesFromViews: function (plugins, toolbarType) {
        const infos = exports.utils.viewInfosByType(plugins, 'toolbarButton');
        return infos
            .filter((info) => info.view.location === toolbarType)
            .map((info) => info.view.commandName);
    },
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const reducer = (draftRoot, action) => {
    var _a;
    var _b, _c;
    if (action.type.indexOf('PLUGIN_') !== 0)
        return;
    // All actions should be scoped to a plugin, except when adding a new plugin
    if (!action.pluginId && action.type !== 'PLUGIN_ADD')
        throw new Error(`action.pluginId is required. Action was: ${JSON.stringify(action)}`);
    const draft = draftRoot.pluginService;
    try {
        switch (action.type) {
            case 'PLUGIN_ADD':
                if (draft.plugins[action.plugin.id])
                    throw new Error(`Plugin is already loaded: ${JSON.stringify(action)}`);
                draft.plugins[action.plugin.id] = action.plugin;
                break;
            case 'PLUGIN_VIEW_ADD':
                draft.plugins[action.pluginId].views[action.view.id] = Object.assign({}, action.view);
                break;
            case 'PLUGIN_VIEW_REMOVE':
                delete draft.plugins[action.pluginId].views[action.viewId];
                break;
            case 'PLUGIN_VIEW_PROP_SET':
                if (action.name !== 'html') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                    draft.plugins[action.pluginId].views[action.id][action.name] = action.value;
                }
                else {
                    (_a = (_b = draft.pluginHtmlContents)[_c = action.pluginId]) !== null && _a !== void 0 ? _a : (_b[_c] = {});
                    draft.pluginHtmlContents[action.pluginId][action.id] = action.value;
                }
                break;
            case 'PLUGIN_VIEW_PROP_PUSH':
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
                draft.plugins[action.pluginId].views[action.id][action.name].push(action.value);
                break;
            case 'PLUGIN_All_STARTED_SET':
                draft.allPluginsStarted = action.value;
                break;
            case 'PLUGIN_CONTENT_SCRIPTS_ADD': {
                const type = action.contentScript.type;
                if (!draft.plugins[action.pluginId].contentScripts[type])
                    draft.plugins[action.pluginId].contentScripts[type] = [];
                draft.plugins[action.pluginId].contentScripts[type].push({
                    id: action.contentScript.id,
                    path: action.contentScript.path,
                });
                break;
            }
            case 'PLUGIN_UNLOAD':
                delete draft.plugins[action.pluginId];
                delete draft.pluginHtmlContents[action.pluginId];
                break;
        }
    }
    catch (error) {
        error.message = `In plugin reducer: ${error.message} Action: ${JSON.stringify(action)}`;
        throw error;
    }
};
exports.default = reducer;
