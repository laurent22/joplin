import produce, { Draft, setAutoFreeze } from 'immer';

export const defaultState = {
	watchedResources: {},
};

setAutoFreeze(false); // TODO: REMOVE ONCE PLUGIN BRANCH HAS BEEN MERGED!!

const reducer = produce((draft: Draft<any>, action:any) => {
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

			delete draft.watchedResources[action.id];
			break;

		case 'RESOURCE_EDIT_WATCHER_CLEAR':

			draft.watchedResources = {};
			break;

		}
	} catch (error) {
		error.message = `In plugin reducer: ${error.message} Action: ${JSON.stringify(action)}`;
		throw error;
	}
});

export default reducer;
