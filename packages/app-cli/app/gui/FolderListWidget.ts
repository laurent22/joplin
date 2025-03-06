import Folder from '@joplin/lib/models/Folder';
import Tag from '@joplin/lib/models/Tag';
import BaseModel from '@joplin/lib/BaseModel';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';
import { FolderEntity } from '@joplin/lib/services/database/types';
import { getDisplayParentId, getTrashFolderId } from '@joplin/lib/services/trash';
const ListWidget = require('tkwidgets/ListWidget.js');

export default class FolderListWidget extends ListWidget {

	private folders_: FolderEntity[] = [];

	public constructor() {
		super();

		this.tags_ = [];
		this.searches_ = [];
		this.selectedFolderId_ = null;
		this.selectedTagId_ = null;
		this.selectedSearchId_ = null;
		this.notesParentType_ = 'Folder';
		this.updateIndexFromSelectedFolderId_ = false;
		this.updateItems_ = false;
		this.trimItemTitle = false;
		this.showIds = false;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		this.itemRenderer = (item: any) => {
			const output = [];
			if (item === '-') {
				output.push('-'.repeat(this.innerWidth));
			} else if (item.type_ === Folder.modelType()) {
				output.push(' '.repeat(this.folderDepth(this.folders, item.id)));

				if (this.showIds) {
					output.push(Folder.shortId(item.id));
				}
				output.push(Folder.displayTitle(item));

				if (Setting.value('showNoteCounts') && !item.deleted_time && item.id !== getTrashFolderId()) {
					let noteCount = item.note_count;
					if (this.folderHasChildren_(this.folders, item.id)) {
						for (let i = 0; i < this.folders.length; i++) {
							if (this.folders[i].parent_id === item.id) {
								// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
								noteCount -= (this.folders[i] as any).note_count;
							}
						}
					}
					output.push(noteCount);
				}
			} else if (item.type_ === Tag.modelType()) {
				output.push(`[${Folder.displayTitle(item)}]`);
			} else if (item.type_ === BaseModel.TYPE_SEARCH) {
				output.push(_('Search:'));
				output.push(item.title);
			}

			return output.join(' ');
		};
	}

	public folderDepth(folders: FolderEntity[], folderId: string) {
		let output = 0;
		while (true) {
			const folder = BaseModel.byId(folders, folderId);
			const folderParentId = getDisplayParentId(folder, folders.find(f => f.id === folder.parent_id));
			if (!folder || !folderParentId) return output;
			output++;
			folderId = folderParentId;
		}
	}

	public get selectedFolderId() {
		return this.selectedFolderId_;
	}

	public set selectedFolderId(v) {
		this.selectedFolderId_ = v;
		this.updateIndexFromSelectedItemId();
		this.invalidate();
	}

	public get selectedSearchId() {
		return this.selectedSearchId_;
	}

	public set selectedSearchId(v) {
		this.selectedSearchId_ = v;
		this.updateIndexFromSelectedItemId();
		this.invalidate();
	}

	public get selectedTagId() {
		return this.selectedTagId_;
	}

	public set selectedTagId(v) {
		this.selectedTagId_ = v;
		this.updateIndexFromSelectedItemId();
		this.invalidate();
	}

	public get notesParentType() {
		return this.notesParentType_;
	}

	public set notesParentType(v) {
		this.notesParentType_ = v;
		this.updateIndexFromSelectedItemId();
		this.invalidate();
	}

	public get searches() {
		return this.searches_;
	}

	public set searches(v) {
		this.searches_ = v;
		this.updateItems_ = true;
		this.updateIndexFromSelectedItemId();
		this.invalidate();
	}

	public get tags() {
		return this.tags_;
	}

	public set tags(v) {
		this.tags_ = v;
		this.updateItems_ = true;
		this.updateIndexFromSelectedItemId();
		this.invalidate();
	}

	public get folders() {
		return this.folders_;
	}

	public set folders(v) {
		this.folders_ = v;
		this.updateItems_ = true;
		this.updateIndexFromSelectedItemId();
		this.invalidate();
	}

	public toggleShowIds() {
		this.showIds = !this.showIds;
		this.invalidate();
	}

	public folderHasChildren_(folders: FolderEntity[], folderId: string) {
		for (let i = 0; i < folders.length; i++) {
			const folder = folders[i];
			const folderParentId = getDisplayParentId(folder, folders.find(f => f.id === folder.parent_id));
			if (folderParentId === folderId) return true;
		}
		return false;
	}

	public render() {
		if (this.updateItems_) {
			this.logger().debug('Rebuilding items...', this.notesParentType, this.selectedJoplinItemId, this.selectedSearchId);
			const wasSelectedItemId = this.selectedJoplinItemId;
			const previousParentType = this.notesParentType;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			let newItems: any[] = [];
			const orderFolders = (parentId: string) => {
				for (let i = 0; i < this.folders.length; i++) {
					const f = this.folders[i];
					const originalParent = this.folders_.find(f => f.id === f.parent_id);

					const folderParentId = getDisplayParentId(f, originalParent); // f.parent_id ? f.parent_id : '';
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

	public get selectedJoplinItemId() {
		if (!this.notesParentType) return '';
		if (this.notesParentType === 'Folder') return this.selectedFolderId;
		if (this.notesParentType === 'Tag') return this.selectedTagId;
		if (this.notesParentType === 'Search') return this.selectedSearchId;
		throw new Error(`Unknown parent type: ${this.notesParentType}`);
	}

	public get selectedJoplinItem() {
		const id = this.selectedJoplinItemId;
		const index = this.itemIndexByKey('id', id);
		return this.itemAt(index);
	}

	public updateIndexFromSelectedItemId(itemId: string = null) {
		if (itemId === null) itemId = this.selectedJoplinItemId;
		const index = this.itemIndexByKey('id', itemId);
		this.currentIndex = index >= 0 ? index : 0;
	}
}
