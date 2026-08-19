import { PluginStates } from '../../services/plugins/reducer';
import getActivePluginEditorViews from '../../services/plugins/utils/getActivePluginEditorViews';
import shim from '../../shim';
const { useMemo } = shim.react();

const useVisiblePluginEditorViewIds = (plugins: PluginStates, windowId: string) => {
	return useMemo(() => {
		const visibleViews = getActivePluginEditorViews(plugins, windowId, { mustBeVisible: true });
		return visibleViews.flatMap(({ editorView }) => editorView.id);
	}, [plugins, windowId]);
};

export default useVisiblePluginEditorViewIds;
