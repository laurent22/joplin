const Folder = require('lib/models/folder.js').Folder;
const Tag = require('lib/models/tag.js').Tag;
const ListWidget = require('tkwidgets/ListWidget.js');

class FolderListWidget extends ListWidget {

	constructor() {
		super();

		this.tags_ = [];
		this.folders_ = [];
		this.selectedFolderId_ = null;
		this.selectedTagId_ = null;
		this.notesParentType_ = 'Folder';
		this.updateIndexFromSelectedFolderId_ = false;
		this.updateItems_ = false;

		this.itemRenderer = (item) => {
			let output = [];
			if (item.type_ === Folder.modelType()) {
				output.push('[n]');
			} else if (item.type_ === Tag.modelType()) {
				output.push('[t]');
			}
			output.push(item.title);
			return output.join(' ');
		};
	}

	get selectedFolderId() {
		return this.selectedFolderId_;
	}

	set selectedFolderId(v) {
		this.updateIndexFromSelectedFolderId_ = true;
		this.selectedFolderId_ = v;
		this.invalidate();
	}

	get selectedTagId() {
		return this.selectedTagId_;
	}

	set selectedTagId(v) {
		this.updateIndexFromSelectedFolderId_ = true;
		this.selectedTagId_ = v;
		this.invalidate();
	}

	get notesParentType() {
		return this.notesParentType_;
	}

	set notesParentType(v) {
		if (this.notesParentType_ === v) return;
		this.notesParentType_ = v;
		this.updateIndexFromSelectedFolderId_ = true;
		this.invalidate();
	}

	get tags() {
		return this.tags_;
	}

	set tags(v) {
		if (this.tags_ === v) return;

		this.tags_ = v;
		this.updateItems_ = true;
		this.updateIndexFromSelectedFolderId_ = true;
		this.invalidate();
	}

	get folders() {
		return this.folders_;
	}

	set folders(v) {
		if (this.folders_ === v) return;

		this.folders_ = v;
		this.updateItems_ = true;
		this.updateIndexFromSelectedFolderId_ = true;
		this.invalidate();
	}

	async onWillRender() {
		if (this.updateItems_) {
			this.items = this.folders.concat(this.tags);
			this.updateItems_ = false;
		}
	}

	render() {
		if (this.updateIndexFromSelectedFolderId_) {
			const index = this.itemIndexByKey('id', this.notesParentType === 'Folder' ? this.selectedFolderId : this.selectedTagId);
			this.currentIndex = index >= 0 ? index : 0;
			this.updateIndexFromSelectedFolderId_ = false;
		}

		super.render();
	}

}

module.exports = FolderListWidget;