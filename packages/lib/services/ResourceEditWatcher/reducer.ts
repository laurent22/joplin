import produce, { Draft } from 'immer';
import { defaultWindowId, stateUtils } from '../../reducer';

export const defaultState = {
	watchedResources: {},
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const reducer = produce((draft: Draft<any>, action: any) => {
	if (action.type.indexOf('RESOURCE_EDIT_WATCHER_') !== 0) return;

	try {
		switch (action.type) {

		case 'RESOURCE_EDIT_WATCHER_SET':

			draft.watchedResources[action.id] = {
				id: action.id,
				title: action.title,
			};
			break;

		case 'RESOURCE_EDIT_WATCHER_REMOVE':
			// RESOURCE_EDIT_WATCHER_REMOVE signals that a resource is no longer being watched.
			// As such, it should be removed from all windows' resource lists:
			for (const windowId in draft.backgroundWindows) {
				// watchedResources is per-window only on desktop:
				if ('watchedResources' in draft.backgroundWindows[windowId]) {
					delete draft.backgroundWindows[windowId].watchedResources[action.id];
				}
			}

			delete draft.watchedResources[action.id];
			break;

		case 'RESOURCE_EDIT_WATCHER_CLEAR': {
			const windowState = stateUtils.windowStateById(draft, action.windowId ?? defaultWindowId);

			// The window may have already been closed.
			const windowExists = !!windowState;
			if (windowExists) {
				windowState.watchedResources = {};
			}
			break;
		}

		}
	} catch (error) {
		error.message = `In plugin reducer: ${error.message} Action: ${JSON.stringify(action)}`;
		throw error;
	}
});

export default reducer;
