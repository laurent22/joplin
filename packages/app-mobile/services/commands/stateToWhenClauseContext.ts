// This extends the generic stateToWhenClauseContext (potentially shared by
// all apps) with additional properties specific to the desktop app. So in
// general, any desktop component should import this file, and not the lib
// one.

import libStateToWhenClauseContext, { WhenClauseContextOptions } from '@joplin/lib/services/commands/stateToWhenClauseContext';
import { AppState } from '../../utils/types';

const stateToWhenClauseContext = (state: AppState, options: WhenClauseContextOptions = null) => {
	return {
		...libStateToWhenClauseContext(state, options),
		keyboardVisible: state.keyboardVisible,
	};
};

export default stateToWhenClauseContext;
