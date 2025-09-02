// This extends the generic stateToWhenClauseContext (potentially shared by
// all apps) with additional properties specific to the desktop app. So in
// general, any desktop component should import this file, and not the lib
// one.

import libStateToWhenClauseContext, { WhenClauseContextOptions } from '@joplin/lib/services/commands/stateToWhenClauseContext';
import { AppState } from '../../utils/types';

const stateToWhenClauseContext = (state: AppState, options: WhenClauseContextOptions = null) => {
	const markdownEditorVisible = state.noteEditorVisible && state.settings['editor.codeView'];
	const richTextEditorVisible = state.noteEditorVisible && !state.settings['editor.codeView'];
	return {
		...libStateToWhenClauseContext(state, options),
		keyboardVisible: state.keyboardVisible,

		// Provide both markdownEditorPaneVisible and markdownEditorVisible for compatibility
		// with the desktop app.
		markdownEditorPaneVisible: markdownEditorVisible,
		markdownEditorVisible: markdownEditorVisible,
		richTextEditorVisible: richTextEditorVisible,
	};
};

export default stateToWhenClauseContext;
