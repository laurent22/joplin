const ArrayUtils = require('lib/ArrayUtils');
const Folder = require('lib/models/Folder');
const BaseModel = require('lib/BaseModel');

let shared = {};

function folderHasChildren_(folders, folderId) {
	for (let i = 0; i < folders.length; i++) {
		let folder = folders[i];
		if (folder.parent_id === folderId) return true;
	}
	return false;
}

function folderIsVisible(folders, folderId, collapsedFolderIds) {
	if (!collapsedFolderIds || !collapsedFolderIds.length) return true;

	while (true) {
		let folder = BaseModel.byId(folders, folderId);
		if (!folder) throw new Error('No folder with id ' + folder.id);
		if (!folder.parent_id) return true;
		if (collapsedFolderIds.indexOf(folder.parent_id) >= 0) return false;
		folderId = folder.parent_id;
	}

	return true;
}

function renderFoldersRecursive_(props, renderItem, items, parentId, depth) {
	const folders = props.folders;
	for (let i = 0; i < folders.length; i++) {
		let folder = folders[i];
		if (!Folder.idsEqual(folder.parent_id, parentId)) continue;
		if (!folderIsVisible(props.folders, folder.id, props.collapsedFolderIds)) continue;
		const hasChildren = folderHasChildren_(folders, folder.id);
		items.push(renderItem(folder, props.selectedFolderId == folder.id && props.notesParentType == 'Folder', hasChildren, depth));
		if (hasChildren) items = renderFoldersRecursive_(props, renderItem, items, folder.id, depth + 1);
	}
	return items;
}

shared.renderFolders = function(props, renderItem) {
	return renderFoldersRecursive_(props, renderItem, [], '', 0);
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

shared.renderSearches = function(props, renderItem) {
	let searches = props.searches.slice();
	let searchItems = [];
	for (let i = 0; i < searches.length; i++) {
		const search = searches[i];
		searchItems.push(renderItem(search, props.selectedSearchId == search.id && props.notesParentType == 'Search'));
	}
	return searchItems;
}

shared.synchronize_press = async function(comp) {
	const Setting = require('lib/models/Setting.js');
	const { reg } = require('lib/registry.js');

	const action = comp.props.syncStarted ? 'cancel' : 'start';

	if (!await reg.syncTarget().isAuthenticated()) {
		if (reg.syncTarget().authRouteName()) {
			comp.props.dispatch({
				type: 'NAV_GO',
				routeName: reg.syncTarget().authRouteName(),
			});
			return 'auth';
		}

		reg.logger().info('Not authentified with sync target - please check your credential.');
		return 'error';
	}

	let sync = null;
	try {
		sync = await reg.syncTarget().synchronizer();
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