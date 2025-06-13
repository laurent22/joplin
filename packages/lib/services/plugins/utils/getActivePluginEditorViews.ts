import { PluginStates } from '../reducer';
import { ContainerType } from '../WebviewController';

interface Options {
	mustBeVisible?: boolean;
}

export default (plugins: PluginStates, windowId: string, { mustBeVisible = false }: Options = {}) => {
	const output = [];

	for (const [, pluginState] of Object.entries(plugins)) {
		for (const [, view] of Object.entries(pluginState.views)) {
			if (view.type !== 'webview' || view.containerType !== ContainerType.Editor) continue;
			if (view.parentWindowId !== windowId || !view.active) continue;

			output.push({ editorPlugin: pluginState, editorView: view });
		}
	}

	if (mustBeVisible) {
		// Filter out views that haven't been shown:
		return output.filter(({ editorView }) => editorView.opened);
	}

	return output;
};

