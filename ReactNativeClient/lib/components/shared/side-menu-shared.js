const Folder = require('lib/models/Folder');
const BaseModel = require('lib/BaseModel');

const shared = {};

function folderHasChildren_(folders, folderId) {
	for (let i = 0; i < folders.length; i++) {
		const folder = folders[i];
		if (folder.parent_id === folderId) return true;
	}
	return false;
}

function folderIsVisible(folders, folderId, collapsedFolderIds) {
	if (!collapsedFolderIds || !collapsedFolderIds.length) return true;

	while (true) {
		const folder = BaseModel.byId(folders, folderId);
		if (!folder) throw new Error(`No folder with id ${folder.id}`);
		if (!folder.parent_id) return true;
		if (collapsedFolderIds.indexOf(folder.parent_id) >= 0) return false;
		folderId = folder.parent_id;
	}
}

function renderFoldersRecursive_(props, renderItem, items, parentId, depth, order) {
	const folders = props.folders;
	for (let i = 0; i < folders.length; i++) {
		const folder = folders[i];
		if (!Folder.idsEqual(folder.parent_id, parentId)) continue;
		if (!folderIsVisible(props.folders, folder.id, props.collapsedFolderIds)) continue;
		const hasChildren = folderHasChildren_(folders, folder.id);
		order.push(folder.id);
		items.push(renderItem(folder, props.selectedFolderId == folder.id && props.notesParentType == 'Folder', hasChildren, depth));
		if (hasChildren) {
			const result = renderFoldersRecursive_(props, renderItem, items, folder.id, depth + 1, order);
			items = result.items;
			order = result.order;
		}
	}
	return {
		items: items,
		order: order,
	};
}

shared.renderFolders = function(props, renderItem) {
	return renderFoldersRecursive_(props, renderItem, [], '', 0, []);
};

shared.renderTags = function(props, renderItem) {
	const tags = props.tags.slice();
	tags.sort((a, b) => {
		// It seems title can sometimes be undefined (perhaps when syncing
		// and before tag has been decrypted?). It would be best to find
		// the root cause but for now that will do.
		//
		// Fixes https://github.com/laurent22/joplin/issues/4051
		if (!a || !a.title || !b || !b.title) return 0;

		// Note: while newly created tags are normalized and lowercase
		// imported tags might be any case, so we need to do case-insensitive
		// sort.
		return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : +1;
	});
	const tagItems = [];
	const order = [];
	for (let i = 0; i < tags.length; i++) {
		const tag = tags[i];
		order.push(tag.id);
		tagItems.push(renderItem(tag, props.selectedTagId == tag.id && props.notesParentType == 'Tag'));
	}
	return {
		items: tagItems,
		order: order,
	};
};

shared.synchronize_press = async function(comp) {
	const { reg } = require('lib/registry.js');

	const action = comp.props.syncStarted ? 'cancel' : 'start';

	if (!(await reg.syncTarget().isAuthenticated())) {
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
};

module.exports = shared;
