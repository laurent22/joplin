import { Draft } from 'immer';

export interface ViewInfo {
	view: any;
	plugin: any;
}

interface PluginViewState {
	id: string;
	type: string;
}

interface PluginViewStates {
	[key: string]: PluginViewState;
}

interface PluginContentScriptState {
	id: string;
	path: string;
}

interface PluginContentScriptStates {
	[type: string]: PluginContentScriptState[];
}

interface PluginState {
	id: string;
	contentScripts: PluginContentScriptStates;
	views: PluginViewStates;
}

export interface PluginStates {
	[key: string]: PluginState;
}

export interface State {
	plugins: PluginStates;
}

export const stateRootKey = 'pluginService';

export const defaultState: State = {
	plugins: {},
};

export const utils = {

	// It is best to use viewsByType instead as this method creates new objects
	// which might trigger unecessary renders even when plugin and views haven't changed.
	viewInfosByType: function(plugins: PluginStates, type: string): ViewInfo[] {
		const output: ViewInfo[] = [];

		for (const pluginId in plugins) {
			const plugin = plugins[pluginId];
			for (const viewId in plugin.views) {
				const view = plugin.views[viewId];
				if (view.type !== type) continue;

				output.push({
					plugin: plugin,
					view: view,
				});
			}
		}

		return output;
	},

	viewsByType: function(plugins: PluginStates, type: string): any[] {
		const output: any[] = [];

		for (const pluginId in plugins) {
			const plugin = plugins[pluginId];
			for (const viewId in plugin.views) {
				const view = plugin.views[viewId];
				if (view.type !== type) continue;

				output.push(view);
			}
		}

		return output;
	},

	commandNamesFromViews: function(plugins: PluginStates, toolbarType: string): string[] {
		const infos = utils.viewInfosByType(plugins, 'toolbarButton');

		return infos
			.filter((info: ViewInfo) => info.view.location === toolbarType)
			.map((info: ViewInfo) => info.view.commandName);
	},
};

const reducer = (draft: Draft<any>, action: any) => {
	if (action.type.indexOf('PLUGIN_') !== 0) return;

	// All actions should be scoped to a plugin, except when adding a new plugin
	if (!action.pluginId && action.type !== 'PLUGIN_ADD') throw new Error(`action.pluginId is required. Action was: ${JSON.stringify(action)}`);

	try {
		switch (action.type) {

		case 'PLUGIN_ADD':

			if (draft.pluginService.plugins[action.plugin.id]) throw new Error(`Plugin is already loaded: ${JSON.stringify(action)}`);
			draft.pluginService.plugins[action.plugin.id] = action.plugin;
			break;

		case 'PLUGIN_VIEW_ADD':

			draft.pluginService.plugins[action.pluginId].views[action.view.id] = { ...action.view };
			break;

		case 'PLUGIN_VIEW_PROP_SET':

			draft.pluginService.plugins[action.pluginId].views[action.id][action.name] = action.value;
			break;

		case 'PLUGIN_VIEW_PROP_PUSH':

			draft.pluginService.plugins[action.pluginId].views[action.id][action.name].push(action.value);
			break;

		case 'PLUGIN_CONTENT_SCRIPTS_ADD': {

			const type = action.contentScript.type;
			if (!draft.pluginService.plugins[action.pluginId].contentScripts[type]) draft.pluginService.plugins[action.pluginId].contentScripts[type] = [];

			draft.pluginService.plugins[action.pluginId].contentScripts[type].push({
				id: action.contentScript.id,
				path: action.contentScript.path,
			});
			break;
		}

		}
	} catch (error) {
		error.message = `In plugin reducer: ${error.message} Action: ${JSON.stringify(action)}`;
		throw error;
	}
};

export default reducer;
