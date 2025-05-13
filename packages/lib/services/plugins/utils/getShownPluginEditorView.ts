import { PluginStates } from '../reducer';
import getActivePluginEditorView from './getActivePluginEditorView';

export default (plugins: PluginStates, shownEditorViewIds: string[]) => {
	const { editorPlugin, editorView } = getActivePluginEditorView(plugins);
	if (editorView) {
		if (!shownEditorViewIds.includes(editorView.id)) return { editorPlugin: null, editorView: null };
	}
	return { editorPlugin, editorView };
};
