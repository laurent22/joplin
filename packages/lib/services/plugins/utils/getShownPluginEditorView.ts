import { PluginStates } from '../reducer';
import getActivePluginEditorViews from './getActivePluginEditorViews';

export default (plugins: PluginStates, windowId: string) => {
	const visibleViews = getActivePluginEditorViews(plugins, windowId, { mustBeVisible: true });
	if (!visibleViews.length) {
		return { editorView: null, editorPlugin: null };
	}
	return visibleViews[0];
};
