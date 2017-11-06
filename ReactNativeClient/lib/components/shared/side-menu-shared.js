let shared = {};

shared.renderFolders = function(props, renderItem) {
	let items = [];
	for (let i = 0; i < props.folders.length; i++) {
		let folder = props.folders[i];
		items.push(renderItem(folder, props.selectedFolderId == folder.id && props.notesParentType == 'Folder'));
	}
	return items;
}

shared.renderTags = function(props, renderItem) {
	let tags = props.tags.slice();
	tags.sort((a, b) => { return a.title < b.title ? -1 : +1; });
	let tagItems = [];
	for (let i = 0; i < tags.length; i++) {
		const tag = tags[i];
		tagItems.push(renderItem(tag, props.selectedTagId == tag.id && props.notesParentType == 'Tag'));
	}
	return tagItems;
}

shared.synchronize_press = async function(comp) {
	const { Setting } = require('lib/models/setting.js');
	const { reg } = require('lib/registry.js');

	const action = comp.props.syncStarted ? 'cancel' : 'start';

	if (Setting.value('sync.target') == Setting.SYNC_TARGET_ONEDRIVE && !reg.oneDriveApi().auth()) {		
		comp.props.dispatch({
			type: 'NAV_GO',
			routeName: 'OneDriveLogin',
		});
		return 'auth';
	}

	let sync = null;
	try {
		sync = await reg.synchronizer(Setting.value('sync.target'))
	} catch (error) {
		reg.logger().info('Could not acquire synchroniser:');
		reg.logger().info(error);
		return 'error';
	}

	if (action == 'cancel') {
		sync.cancel();
		return 'cancel';
	} else {
		reg.scheduleSync(0);
		return 'sync';
	}
}

module.exports = shared;