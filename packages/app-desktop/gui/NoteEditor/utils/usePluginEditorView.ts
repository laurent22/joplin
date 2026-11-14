import { useContext, useMemo } from 'react';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import getShownPluginEditorView from '@joplin/lib/services/plugins/utils/getShownPluginEditorView';
import { WindowIdContext } from '../../NewWindowOrIFrame';

// If a plugin editor should be shown for the current note, this function will return the plugin and
// associated view.
export default (plugins: PluginStates, disabled = false) => {
	const windowId = useContext(WindowIdContext);
	return useMemo(() => {
		return getShownPluginEditorView(disabled ? {} : plugins, windowId);
	}, [plugins, windowId, disabled]);
};
