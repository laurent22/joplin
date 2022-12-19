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

export interface PluginHtmlContent {
	[viewId: string]: string;
}

export interface PluginHtmlContents {
	[pluginId: string]: PluginHtmlContent;
}

export interface State {
	plugins: PluginStates;
	pluginHtmlContents: PluginHtmlContents;
}

export const stateRootKey = 'pluginService';

export const defaultState: State = {
	plugins: {},
	pluginHtmlContents: {},
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

	viewInfoByViewId: function(plugins: PluginStates, viewId: string): ViewInfo {
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

	allViewIds: function(plugins: PluginStates): string[] {
		const output = [];
		for (const pluginId in plugins) {
			const plugin = plugins[pluginId];
			for (const viewId in plugin.views) {
				output.push(viewId);
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

const reducer = (draftRoot: Draft<any>, action: any) => {
	if (action.type.indexOf('PLUGIN_') !== 0) return;

	// All actions should be scoped to a plugin, except when adding a new plugin
	if (!action.pluginId && action.type !== 'PLUGIN_ADD') throw new Error(`action.pluginId is required. Action was: ${JSON.stringify(action)}`);

	const draft = draftRoot.pluginService as State;

	try {
		switch (action.type) {

		case 'PLUGIN_ADD':

			if (draft.plugins[action.plugin.id]) throw new Error(`Plugin is already loaded: ${JSON.stringify(action)}`);
			draft.plugins[action.plugin.id] = action.plugin;
			break;

		case 'PLUGIN_VIEW_ADD':

			draft.plugins[action.pluginId].views[action.view.id] = { ...action.view };
			break;

		case 'PLUGIN_VIEW_PROP_SET':

			if (action.name !== 'html') {
				(draft.plugins[action.pluginId].views[action.id] as any)[action.name] = action.value;
			} else {
				draft.pluginHtmlContents[action.pluginId] ??= {};
				draft.pluginHtmlContents[action.pluginId][action.id] = action.value;
			}
			break;

		case 'PLUGIN_VIEW_PROP_PUSH':

			(draft.plugins[action.pluginId].views[action.id] as any)[action.name].push(action.value);
			break;

		case 'PLUGIN_CONTENT_SCRIPTS_ADD': {

			const type = action.contentScript.type;
			if (!draft.plugins[action.pluginId].contentScripts[type]) draft.plugins[action.pluginId].contentScripts[type] = [];

			draft.plugins[action.pluginId].contentScripts[type].push({
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
