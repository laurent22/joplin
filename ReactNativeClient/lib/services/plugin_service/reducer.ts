import produce, { Draft } from 'immer';

export const stateRootKey = 'pluginService';

export const defaultState = {
	plugins: {},
};

const reducer = produce((draft: Draft<any>, action:any) => {
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

		}
	} catch (error) {
		error.message = `In plugin reducer: ${error.message} Action: ${JSON.stringify(action)}`;
		throw error;
	}
});

export default reducer;
