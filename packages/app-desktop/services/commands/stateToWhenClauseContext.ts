// This extends the generic stateToWhenClauseContext (potentially shared by
// all apps) with additional properties specific to the desktop app. So in
// general, any desktop component should import this file, and not the lib
// one.

import { AppState } from '../../app.reducer';
import libStateToWhenClauseContext, { WhenClauseContextOptions } from '@joplin/lib/services/commands/stateToWhenClauseContext';
import layoutItemProp from '../../gui/ResizableLayout/utils/layoutItemProp';
import { defaultWindowId, stateUtils } from '@joplin/lib/reducer';

export default function stateToWhenClauseContext(state: AppState, options: WhenClauseContextOptions = null) {
	const windowId = options?.windowId ?? defaultWindowId;
	const isMainWindow = windowId === defaultWindowId;
	const windowState = stateUtils.windowStateById(state, windowId);

	return {
		...libStateToWhenClauseContext(state, options),

		// UI elements
		markdownEditorVisible: !!windowState.editorCodeView && !state.settings['isSafeMode'],
		richTextEditorVisible: !windowState.editorCodeView && !state.settings['isSafeMode'],

		markdownEditorPaneVisible: windowState.editorCodeView && windowState.noteVisiblePanes.includes('editor'),
		markdownViewerPaneVisible: windowState.editorCodeView && windowState.noteVisiblePanes.includes('viewer'),
		modalDialogVisible: !!Object.keys(state.visibleDialogs).length,
		gotoAnythingVisible: !!state.visibleDialogs['gotoAnything'],
		sidebarVisible: isMainWindow && !!state.mainLayout && layoutItemProp(state.mainLayout, 'sideBar', 'visible'),
		noteListHasNotes: !!windowState.notes.length,

		// Deprecated
		sideBarVisible: !!state.mainLayout && layoutItemProp(state.mainLayout, 'sideBar', 'visible'),
	};
}
