const Folder = require('lib/models/folder.js').Folder;
const Tag = require('lib/models/tag.js').Tag;
const BaseModel = require('lib/base-model.js').BaseModel;
const ListWidget = require('tkwidgets/ListWidget.js');

class FolderListWidget extends ListWidget {

	constructor() {
		super();

		this.tags_ = [];
		this.folders_ = [];
		this.searches_ = [];
		this.selectedFolderId_ = null;
		this.selectedTagId_ = null;
		this.selectedSearchId_ = null;
		this.notesParentType_ = 'Folder';
		this.updateIndexFromSelectedFolderId_ = false;
		this.updateItems_ = false;

		this.itemRenderer = (item) => {
			let output = [];
			if (item.type_ === Folder.modelType()) {
				output.push('[n]');
			} else if (item.type_ === Tag.modelType()) {
				output.push('[t]');
			} else if (item.type_ === BaseModel.TYPE_SEARCH) {
				output.push('[s]');
			}
			output.push(item.title);
			// output.push(item.id.substr(0, 5));
			return output.join(' ');
		};
	}

	get selectedFolderId() {
		return this.selectedFolderId_;
	}

	set selectedFolderId(v) {
		this.updateIndexFromSelectedItemId()
		this.selectedFolderId_ = v;
		this.invalidate();
	}

	get selectedSearchId() {
		return this.selectedSearchId_;
	}

	set selectedSearchId(v) {
		this.updateIndexFromSelectedItemId()
		this.selectedSearchId_ = v;
		this.invalidate();
	}

	get selectedTagId() {
		return this.selectedTagId_;
	}

	set selectedTagId(v) {
		this.updateIndexFromSelectedItemId()
		this.selectedTagId_ = v;
		this.invalidate();
	}

	get notesParentType() {
		return this.notesParentType_;
	}

	set notesParentType(v) {
		if (this.notesParentType_ === v) return;
		this.notesParentType_ = v;
		this.updateIndexFromSelectedItemId()
		this.invalidate();
	}

	get searches() {
		return this.searches_;
	}

	set searches(v) {
		if (this.searches_ === v) return;

		this.searches_ = v;
		this.updateItems_ = true;
		this.updateIndexFromSelectedItemId()
		this.invalidate();
	}

	get tags() {
		return this.tags_;
	}

	set tags(v) {
		if (this.tags_ === v) return;

		this.tags_ = v;
		this.updateItems_ = true;
		this.updateIndexFromSelectedItemId()
		this.invalidate();
	}

	get folders() {
		return this.folders_;
	}

	set folders(v) {
		if (this.folders_ === v) return;

		this.folders_ = v;
		this.updateItems_ = true;
		this.updateIndexFromSelectedItemId()
		this.invalidate();
	}

	async onWillRender() {
		if (this.updateItems_) {
			this.logger().info('Rebuilding items...', this.notesParentType, this.selectedItemId, this.selectedSearchId);
			const wasSelectedItemId = this.selectedItemId;
			const previousParentType = this.notesParentType;
			this.items = this.folders.concat(this.tags).concat(this.searches);
			this.notesParentType = previousParentType;
			this.updateIndexFromSelectedItemId(wasSelectedItemId)
			this.updateItems_ = false;
		}
	}

	get selectedItemId() {
		if (!this.notesParentType) return '';
		if (this.notesParentType === 'Folder') return this.selectedFolderId;
		if (this.notesParentType === 'Tag') return this.selectedTagId;
		if (this.notesParentType === 'Search') return this.selectedSearchId;
		throw new Error('Unknown parent type: ' + this.notesParentType);
	}

	updateIndexFromSelectedItemId(itemId = null) {
		if (itemId === null) itemId = this.selectedItemId;
		const index = this.itemIndexByKey('id', itemId);
		//this.logger().info('Setting index to', this.notesParentType, index);
		this.currentIndex = index >= 0 ? index : 0;
	}

}

module.exports = FolderListWidget;