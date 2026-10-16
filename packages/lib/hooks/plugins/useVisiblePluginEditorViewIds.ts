import { PluginStates } from '../../services/plugins/reducer';
import getActivePluginEditorViews from '../../services/plugins/utils/getActivePluginEditorViews';
import shim from '../../shim';
const { useMemo } = shim.react();

const useVisiblePluginEditorViewIds = (plugins: PluginStates, windowId: string, disabled = false) => {
	return useMemo(() => {
		// While a conflict is being resolved no plugin editor is shown
		const visibleViews = getActivePluginEditorViews(disabled ? {} : plugins, windowId, { mustBeVisible: true });
		return visibleViews.flatMap(({ editorView }) => editorView.id);
	}, [plugins, windowId, disabled]);
};

export default useVisiblePluginEditorViewIds;
