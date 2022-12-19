// This extends the generic stateToWhenClauseContext (potentially shared by
// all apps) with additional properties specific to the desktop app. So in
// general, any desktop component should import this file, and not the lib
// one.

import { AppState } from '../../app.reducer';
import libStateToWhenClauseContext, { WhenClauseContextOptions } from '@joplin/lib/services/commands/stateToWhenClauseContext';
import layoutItemProp from '../../gui/ResizableLayout/utils/layoutItemProp';

export default function stateToWhenClauseContext(state: AppState, options: WhenClauseContextOptions = null) {
	return {
		...libStateToWhenClauseContext(state, options),

		// UI elements
		markdownEditorVisible: !!state.settings['editor.codeView'],
		richTextEditorVisible: !state.settings['editor.codeView'],
		markdownEditorPaneVisible: state.settings['editor.codeView'] && state.noteVisiblePanes.includes('editor'),
		markdownViewerPaneVisible: state.settings['editor.codeView'] && state.noteVisiblePanes.includes('viewer'),
		modalDialogVisible: !!Object.keys(state.visibleDialogs).length,
		gotoAnythingVisible: !!state.visibleDialogs['gotoAnything'],
		sidebarVisible: !!state.mainLayout && layoutItemProp(state.mainLayout, 'sideBar', 'visible'),
		noteListHasNotes: !!state.notes.length,

		// Deprecated
		sideBarVisible: !!state.mainLayout && layoutItemProp(state.mainLayout, 'sideBar', 'visible'),
	};
}
