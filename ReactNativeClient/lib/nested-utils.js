/* eslint no-useless-escape: 0*/

function nestedPath(items, itemId) {
	const idToItem = {};
	for (let i = 0; i < items.length; i++) {
		idToItem[items[i].id] = items[i];
	}

	const path = [];
	while (itemId) {
		const item = idToItem[itemId];
		if (!item) break; // Shouldn't happen
		path.push(item);
		itemId = item.parent_id;
	}

	path.reverse();

	return path;
}

module.exports = { nestedPath };
