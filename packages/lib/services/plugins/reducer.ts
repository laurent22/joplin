import { Draft } from 'immer';
import { ContainerType } from './WebviewController';
import { ButtonSpec } from './api/types';

export interface PluginViewState {
	id: string;
	type: string;
	// Note that this property will mean different thing depending on the `containerType`. If it's a
	// dialog, it means that the dialog is opened. If it's a panel, it means it's visible/opened. If
	// it's an editor, it means the editor is currently active (but it may not be visible - see
	// JoplinViewsEditor).
	opened: boolean;
	buttons: ButtonSpec[];
	fitToContent?: boolean;
	scripts?: string[];
	html?: string;
	commandName?: string;
	location?: string;
	containerType: ContainerType;
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

export interface PluginState {
	id: string;
	contentScripts: PluginContentScriptStates;
	views: PluginViewStates;
}

export interface ViewInfo {
	view: PluginViewState;
	plugin: PluginState;
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
	allPluginsStarted: boolean;
}

export const stateRootKey = 'pluginService';

export const defaultState: State = {
	plugins: {},
	pluginHtmlContents: {},
	allPluginsStarted: false,
};

export const utils = {

	// It is best to use viewsByType instead as this method creates new objects
	// which might trigger unnecessary renders even when plugin and views haven't changed.
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	viewsByType: function(plugins: PluginStates, type: string): any[] {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				(draft.plugins[action.pluginId].views[action.id] as any)[action.name] = action.value;
			} else {
				draft.pluginHtmlContents[action.pluginId] ??= {};
				draft.pluginHtmlContents[action.pluginId][action.id] = action.value;
			}
			break;

		case 'PLUGIN_VIEW_PROP_PUSH':

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			(draft.plugins[action.pluginId].views[action.id] as any)[action.name].push(action.value);
			break;

		case 'PLUGIN_All_STARTED_SET':

			draft.allPluginsStarted = action.value;
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

		case 'PLUGIN_UNLOAD':
			delete draft.plugins[action.pluginId];
			delete draft.pluginHtmlContents[action.pluginId];
			break;

		}
	} catch (error) {
		error.message = `In plugin reducer: ${error.message} Action: ${JSON.stringify(action)}`;
		throw error;
	}
};

export default reducer;
