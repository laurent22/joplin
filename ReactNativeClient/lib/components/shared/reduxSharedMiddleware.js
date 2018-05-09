const reduxSharedMiddleware = function(store, next, action) {
	const newState = store.getState();

	if (action.type == 'FOLDER_SET_COLLAPSED' || action.type == 'FOLDER_TOGGLE') {
		Setting.setValue('collapsedFolderIds', newState.collapsedFolderIds);
	}
}

module.exports = reduxSharedMiddleware;