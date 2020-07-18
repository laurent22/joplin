const BaseItem = require('lib/models/BaseItem');
const BaseModel = require('lib/BaseModel');
const Tag = require('lib/models/Tag');

const shared = {};

function itemHasChildren_(items, itemId) {
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (item.parent_id === itemId) return true;
	}
	return false;
}

function itemIsVisible(items, itemId, collapsedItemIds) {
	if (!collapsedItemIds || !collapsedItemIds.length) return true;

	while (true) {
		const item = BaseModel.byId(items, itemId);
		if (!item) throw new Error(`No item with id ${itemId}`);
		if (!item.parent_id) return true;
		if (collapsedItemIds.indexOf(item.parent_id) >= 0) return false;
		itemId = item.parent_id;
	}
}

function renderItemsRecursive_(props, renderItem, items, parentId, depth, order, itemType) {
	let itemsKey = '';
	let notesParentType = '';
	let collapsedItemsKey = '';
	let selectedItemKey = '';
	if (itemType === BaseModel.TYPE_FOLDER) {
		itemsKey = 'folders';
		notesParentType = 'Folder';
		collapsedItemsKey = 'collapsedFolderIds';
		selectedItemKey = 'selectedFolderId';
	} else if (itemType === BaseModel.TYPE_TAG) {
		itemsKey = 'tags';
		notesParentType = 'Tag';
		collapsedItemsKey = 'collapsedTagIds';
		selectedItemKey = 'selectedTagId';
	}

	const propItems = props[itemsKey];
	for (let i = 0; i < propItems.length; i++) {
		const item = propItems[i];
		if (!BaseItem.getClassByItemType(itemType).idsEqual(item.parent_id, parentId)) continue;
		if (!itemIsVisible(props[itemsKey], item.id, props[collapsedItemsKey])) continue;
		const hasChildren = itemHasChildren_(propItems, item.id);
		order.push(item.id);
		items.push(renderItem(item, props[selectedItemKey] == item.id && props.notesParentType == notesParentType, hasChildren, depth));
		if (hasChildren) {
			const result = renderItemsRecursive_(props, renderItem, items, item.id, depth + 1, order, itemType);
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
	return renderItemsRecursive_(props, renderItem, [], '', 0, [], BaseModel.TYPE_FOLDER);
};

shared.renderTags = function(props, renderItem) {
	props = Object.assign({}, props);
	const tags = props.tags.slice();
	// Sort tags alphabetically
	tags.sort((a, b) => {
		return Tag.getCachedFullTitle(a.id) < Tag.getCachedFullTitle(b.id) ? -1 : 1;
	});
	props.tags = tags;
	return renderItemsRecursive_(props, renderItem, [], '', 0, [], BaseModel.TYPE_TAG);
};

// shared.renderSearches = function(props, renderItem) {
// 	let searches = props.searches.slice();
// 	let searchItems = [];
// 	const order = [];
// 	for (let i = 0; i < searches.length; i++) {
// 		const search = searches[i];
// 		order.push(search.id);
// 		searchItems.push(renderItem(search, props.selectedSearchId == search.id && props.notesParentType == 'Search'));
// 	}
// 	return {
// 		items: searchItems,
// 		order: order,
// 	};
// }

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
