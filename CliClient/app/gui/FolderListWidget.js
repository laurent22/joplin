const Folder = require('lib/models/folder.js').Folder;
const ListWidget = require('tkwidgets/ListWidget.js');

class FolderListWidget extends ListWidget {

	constructor() {
		super();
		this.selectedFolderId_ = 0;

		this.setItemRenderer((item) => {
			return item.title;
		});
	}

	get selectedFolderId() {
		return this.selectedFolderId_;
	}

	set selectedFolderId(v) {
		if (v === this.selectedFolderId_) return;
		this.selectedFolderId_ = v;
		const index = this.itemIndexByKey('id', this.selectedFolderId_);
		this.currentIndex = index >= 0 ? index : 0;
	}

}

module.exports = FolderListWidget;