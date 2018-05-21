const Setting = require('lib/models/Setting');
const { reg } = require('lib/registry.js');

const reduxSharedMiddleware = function(store, next, action) {
	const newState = store.getState();

	if (action.type == 'FOLDER_SET_COLLAPSED' || action.type == 'FOLDER_TOGGLE') {
		Setting.setValue('collapsedFolderIds', newState.collapsedFolderIds);
	}

	if (action.type === 'SETTING_UPDATE_ONE' && !!action.key.match(/^sync\.\d+\.path$/)) {
		reg.resetSyncTarget();
	}
	
}

module.exports = reduxSharedMiddleware;