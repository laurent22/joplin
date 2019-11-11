const Setting = require('lib/models/Setting');
const Tag = require('lib/models/Tag');
const { reg } = require('lib/registry.js');
const ResourceFetcher = require('lib/services/ResourceFetcher');

const reduxSharedMiddleware = async function(store, next, action) {
	const newState = store.getState();

	let refreshTags = false;

	if (action.type == 'FOLDER_SET_COLLAPSED' || action.type == 'FOLDER_TOGGLE') {
		Setting.setValue('collapsedFolderIds', newState.collapsedFolderIds);
	}

	if (action.type === 'SETTING_UPDATE_ONE' && !!action.key.match(/^sync\.\d+\.path$/)) {
		reg.resetSyncTarget();
	}

	if (action.type === 'SETTING_UPDATE_ONE' && action.key === 'sync.resourceDownloadMode') {
		ResourceFetcher.instance().autoAddResources();
	}

	if (action.type == 'NOTE_DELETE' ||
		action.type == 'NOTE_UPDATE_ONE' ||
		action.type == 'NOTE_UPDATE_ALL' ||
		action.type == 'NOTE_TAG_REMOVE' ||
		action.type == 'TAG_UPDATE_ONE') {
		refreshTags = true;
	}

	if (refreshTags) {
		store.dispatch({
			type: 'TAG_UPDATE_ALL',
			items: await Tag.allWithNotes(),
		});
	}
};

module.exports = reduxSharedMiddleware;
