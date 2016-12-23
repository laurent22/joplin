export function rootItems(items) {
	var output = [];
	items.forEach((item, index) => {
		if (!item.parent_id) return;
		output.push(item);
	});
	return output;
}

export function folders(items) {
	var output = [];
	items.forEach((item, index) => {
		if (item.type != 1) return;
		output.push(item);
	});
	return output;
}

export function notes(items, folderId) {
	var output = [];
	items.forEach((item, index) => {
		if (item.type != 2) return;
		if (item.parent_id != folderId) return;
		output.push(item);
	});
	return output;
}

export function byId(items, id) {
	for (let i = 0; i < items.length; i++) {
		if (items[i].id == id) return items[i];
	}
	return null;
}

export function children(items, id) {
	var output = [];
	for (let i = 0; i < items.length; i++) {
		if (items[i].parent_id == id) output.push(items[i]);
	}
	return output;
}