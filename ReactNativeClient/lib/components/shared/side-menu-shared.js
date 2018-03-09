let shared = {};

shared.renderFolders = function(props, renderItem) {
	let items = [];
	for (let i = 0; i < props.folders.length; i++) {
		let folder = props.folders[i];
		items.push(renderItem(folder, props.selectedFolderId == folder.id && props.notesParentType == "Folder"));
	}
	return items;
};

shared.renderTags = function(props, renderItem) {
	let tags = props.tags.slice();
	tags.sort((a, b) => {
		return a.title < b.title ? -1 : +1;
	});
	let tagItems = [];
	for (let i = 0; i < tags.length; i++) {
		const tag = tags[i];
		tagItems.push(renderItem(tag, props.selectedTagId == tag.id && props.notesParentType == "Tag"));
	}
	return tagItems;
};

shared.renderSearches = function(props, renderItem) {
	let searches = props.searches.slice();
	let searchItems = [];
	for (let i = 0; i < searches.length; i++) {
		const search = searches[i];
		searchItems.push(renderItem(search, props.selectedSearchId == search.id && props.notesParentType == "Search"));
	}
	return searchItems;
};

shared.synchronize_press = async function(comp) {
	const Setting = require("lib/models/Setting.js");
	const { reg } = require("lib/registry.js");

	const action = comp.props.syncStarted ? "cancel" : "start";

	if (!reg.syncTarget().isAuthenticated()) {
		if (reg.syncTarget().authRouteName()) {
			comp.props.dispatch({
				type: "NAV_GO",
				routeName: reg.syncTarget().authRouteName(),
			});
			return "auth";
		}

		reg.logger().info("Not authentified with sync target - please check your credential.");
		return "error";
	}

	let sync = null;
	try {
		sync = await reg.syncTarget().synchronizer();
	} catch (error) {
		reg.logger().info("Could not acquire synchroniser:");
		reg.logger().info(error);
		return "error";
	}

	if (action == "cancel") {
		sync.cancel();
		return "cancel";
	} else {
		reg.scheduleSync(0);
		return "sync";
	}
};

module.exports = shared;
