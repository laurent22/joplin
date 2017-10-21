const Folder = require('lib/models/folder.js').Folder;
const ListWidget = require('tkwidgets/ListWidget.js');

class FolderListWidget extends ListWidget {

	constructor() {
		super();
		this.selectedFolderId_ = 0;

		this.updateIndexFromSelectedFolderId_ = false;

		this.itemRenderer = (item) => {
			return item.title + ' ' + item.id;
		};
	}

	get selectedFolderId() {
		return this.selectedFolderId_;
	}

	set selectedFolderId(v) {
		this.updateIndexFromSelectedFolderId_ = true;
		this.selectedFolderId_ = v;
	}

	render() {
		if (this.updateIndexFromSelectedFolderId_) {
			const index = this.itemIndexByKey('id', this.selectedFolderId_);
			this.currentIndex = index >= 0 ? index : 0;
			this.updateIndexFromSelectedFolderId_ = false;
		}

		super.render();
	}

}

module.exports = FolderListWidget;