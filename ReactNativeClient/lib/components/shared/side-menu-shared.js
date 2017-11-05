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

module.exports = shared;