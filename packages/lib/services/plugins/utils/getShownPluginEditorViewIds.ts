import { PluginStates } from '../reducer';
import getActivePluginEditorViews from './getActivePluginEditorViews';

export default (state: PluginStates, windowId: string) => {
	return getActivePluginEditorViews(
		state, windowId, { mustBeVisible: true },
	).map(({ editorView }) => editorView.id);
};
