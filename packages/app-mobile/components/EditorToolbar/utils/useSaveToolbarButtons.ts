import { useRef, useEffect, MutableRefObject } from 'react';
import Setting from '@joplin/lib/models/Setting';
import { ReorderableItem } from './useToolbarEditorState';

// Persists the enabled toolbar button order to settings after user edits.
// Skips the initial mount and any change triggered by reinitialize (indicated
// by the caller setting isReinitializing.current = true before the state update).
const useSaveToolbarButtons = (
	enabledItems: ReorderableItem[],
	isReinitializing: MutableRefObject<boolean>,
) => {
	const isInitialMount = useRef(true);
	useEffect(() => {
		if (isInitialMount.current) {
			isInitialMount.current = false;
			return;
		}
		if (isReinitializing.current) {
			isReinitializing.current = false;
			return;
		}
		Setting.setValue('editor.toolbarButtons', enabledItems.map(item => item.commandName));
	}, [enabledItems, isReinitializing]);
};

export default useSaveToolbarButtons;
