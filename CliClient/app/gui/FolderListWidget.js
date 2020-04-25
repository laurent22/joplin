const Folder = require('lib/models/Folder.js');
const Tag = require('lib/models/Tag.js');
const BaseModel = require('lib/BaseModel.js');
const ListWidget = require('tkwidgets/ListWidget.js');
const _ = require('lib/locale.js')._;

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
		this.trimItemTitle = false;

		this.itemRenderer = item => {
			const output = [];
			if (item === '-') {
				output.push('-'.repeat(this.innerWidth));
			} else if (item.type_ === Folder.modelType()) {
				output.push(' '.repeat(this.folderDepth(this.folders, item.id)) + Folder.displayTitle(item));
			} else if (item.type_ === Tag.modelType()) {
				output.push(`[${Folder.displayTitle(item)}]`);
			} else if (item.type_ === BaseModel.TYPE_SEARCH) {
				output.push(_('Search:'));
				output.push(item.title);
			}

			return output.join(' ');
		};
	}

	folderDepth(folders, folderId) {
		let output = 0;
		while (true) {
			const folder = BaseModel.byId(folders, folderId);
			if (!folder || !folder.parent_id) return output;
			output++;
			folderId = folder.parent_id;
		}
	}

	get selectedFolderId() {
		return this.selectedFolderId_;
	}

	set selectedFolderId(v) {
		this.selectedFolderId_ = v;
		this.updateIndexFromSelectedItemId();
		this.invalidate();
	}

	get selectedSearchId() {
		return this.selectedSearchId_;
	}

	set selectedSearchId(v) {
		this.selectedSearchId_ = v;
		this.updateIndexFromSelectedItemId();
		this.invalidate();
	}

	get selectedTagId() {
		return this.selectedTagId_;
	}

	set selectedTagId(v) {
		this.selectedTagId_ = v;
		this.updateIndexFromSelectedItemId();
		this.invalidate();
	}

	get notesParentType() {
		return this.notesParentType_;
	}

	set notesParentType(v) {
		this.notesParentType_ = v;
		this.updateIndexFromSelectedItemId();
		this.invalidate();
	}

	get searches() {
		return this.searches_;
	}

	set searches(v) {
		this.searches_ = v;
		this.updateItems_ = true;
		this.updateIndexFromSelectedItemId();
		this.invalidate();
	}

	get tags() {
		return this.tags_;
	}

	set tags(v) {
		this.tags_ = v;
		this.updateItems_ = true;
		this.updateIndexFromSelectedItemId();
		this.invalidate();
	}

	get folders() {
		return this.folders_;
	}

	set folders(v) {
		this.folders_ = v;
		this.updateItems_ = true;
		this.updateIndexFromSelectedItemId();
		this.invalidate();
	}

	folderHasChildren_(folders, folderId) {
		for (let i = 0; i < folders.length; i++) {
			const folder = folders[i];
			if (folder.parent_id === folderId) return true;
		}
		return false;
	}

	render() {
		if (this.updateItems_) {
			this.logger().debug('Rebuilding items...', this.notesParentType, this.selectedJoplinItemId, this.selectedSearchId);
			const wasSelectedItemId = this.selectedJoplinItemId;
			const previousParentType = this.notesParentType;

			let newItems = [];
			const orderFolders = parentId => {
				for (let i = 0; i < this.folders.length; i++) {
					const f = this.folders[i];
					const folderParentId = f.parent_id ? f.parent_id : '';
					if (folderParentId === parentId) {
						newItems.push(f);
						if (this.folderHasChildren_(this.folders, f.id)) orderFolders(f.id);
					}
				}
			};

			orderFolders('');

			if (this.tags.length) {
				if (newItems.length) newItems.push('-');
				newItems = newItems.concat(this.tags);
			}

			if (this.searches.length) {
				if (newItems.length) newItems.push('-');
				newItems = newItems.concat(this.searches);
			}

			this.items = newItems;

			this.notesParentType = previousParentType;
			this.updateIndexFromSelectedItemId(wasSelectedItemId);
			this.updateItems_ = false;
		}

		super.render();
	}

	get selectedJoplinItemId() {
		if (!this.notesParentType) return '';
		if (this.notesParentType === 'Folder') return this.selectedFolderId;
		if (this.notesParentType === 'Tag') return this.selectedTagId;
		if (this.notesParentType === 'Search') return this.selectedSearchId;
		throw new Error(`Unknown parent type: ${this.notesParentType}`);
	}

	get selectedJoplinItem() {
		const id = this.selectedJoplinItemId;
		const index = this.itemIndexByKey('id', id);
		return this.itemAt(index);
	}

	updateIndexFromSelectedItemId(itemId = null) {
		if (itemId === null) itemId = this.selectedJoplinItemId;
		const index = this.itemIndexByKey('id', itemId);
		this.currentIndex = index >= 0 ? index : 0;
	}
}

module.exports = FolderListWidget;
