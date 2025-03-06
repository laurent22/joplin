import Logger from '@joplin/utils/Logger';
import { PluginState, PluginStates, PluginViewState } from '../reducer';
import { ContainerType } from '../WebviewController';

const logger = Logger.create('getActivePluginEditorView');

interface Output {
	editorPlugin: PluginState;
	editorView: PluginViewState;
}

export default (plugins: PluginStates) => {
	let output: Output = { editorPlugin: null, editorView: null };
	for (const [, pluginState] of Object.entries(plugins)) {
		for (const [, view] of Object.entries(pluginState.views)) {
			if (view.type === 'webview' && view.containerType === ContainerType.Editor && view.opened) {
				if (output.editorPlugin) {
					logger.warn(`More than one editor plugin are active for this note. Active plugin: ${output.editorPlugin.id}. Ignored plugin: ${pluginState.id}`);
				} else {
					output = { editorPlugin: pluginState, editorView: view };
				}
			}
		}
	}

	return output;
};

