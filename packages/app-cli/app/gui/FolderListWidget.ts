import Folder from '@joplin/lib/models/Folder';
import Tag from '@joplin/lib/models/Tag';
import BaseModel from '@joplin/lib/BaseModel';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';
import { FolderEntity } from '@joplin/lib/services/database/types';
import {
	getDisplayParentId,
	getTrashFolderId,
} from '@joplin/lib/services/trash';
const ListWidget = require('tkwidgets/ListWidget.js');

// Service for managing folder collapse states
class FolderCollapseService {
	private static instance_: FolderCollapseService;
	private collapsedFolders_: Set<string> = new Set();

	public static instance(): FolderCollapseService {
		if (!this.instance_) {
			this.instance_ = new FolderCollapseService();
			this.instance_.loadFromSettings();
		}
		return this.instance_;
	}

	public isCollapsed(folderId: string): boolean {
		return this.collapsedFolders_.has(folderId);
	}

	public setCollapsed(folderId: string, collapsed: boolean) {
		if (collapsed) {
			this.collapsedFolders_.add(folderId);
		} else {
			this.collapsedFolders_.delete(folderId);
		}
		this.saveToSettings();
	}

	public toggleCollapsed(folderId: string): boolean {
		const newState = !this.isCollapsed(folderId);
		this.setCollapsed(folderId, newState);
		return newState;
	}

	public expandToFolder(folderId: string, folders: FolderEntity[]) {
		// Find all parent folders and expand them
		const parentsToExpand: string[] = [];
		let currentId = folderId;

		while (currentId) {
			const folder = BaseModel.byId(folders, currentId);
			if (!folder) break;

			const parentId = getDisplayParentId(
				folder,
				folders.find((f) => f.id === folder.parent_id),
			);
			if (parentId) {
				parentsToExpand.unshift(parentId);
				currentId = parentId;
			} else {
				break;
			}
		}

		// Expand all parent folders
		for (const parentId of parentsToExpand) {
			this.setCollapsed(parentId, false);
		}
	}

	private loadFromSettings() {
		try {
			const stored = Setting.value('cli.folderCollapseState');
			if (stored && typeof stored === 'string') {
				const folderIds = JSON.parse(stored);
				this.collapsedFolders_ = new Set(folderIds);
			}
		} catch (error) {
			// If there's an error loading, start with empty state
			this.collapsedFolders_ = new Set();
		}
	}

	private saveToSettings() {
		try {
			const folderIds = Array.from(this.collapsedFolders_);
			Setting.setValue('cli.folderCollapseState', JSON.stringify(folderIds));
		} catch (error) {
			// Silently ignore save errors
		}
	}
}

export default class FolderListWidget extends ListWidget {
	private folders_: FolderEntity[] = [];
	private collapseService_: FolderCollapseService;

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
		this.collapseService_ = FolderCollapseService.instance();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		this.itemRenderer = (item: any) => {
			const output = [];
			if (item === '-') {
				output.push('-'.repeat(this.innerWidth));
			} else if (item.type_ === Folder.modelType()) {
				const depth = this.folderDepth(this.folders, item.id);
				output.push(' '.repeat(depth));

				// Add collapse/expand indicator
				const hasChildren = this.folderHasChildren_(this.folders, item.id);
				if (hasChildren) {
					const isCollapsed = this.collapseService_.isCollapsed(item.id);
					output.push(isCollapsed ? '[+] ' : '[-] ');
				} else {
					output.push('  '); // Space for alignment
				}

				if (this.showIds) {
					output.push(Folder.shortId(item.id));
				}
				output.push(Folder.displayTitle(item));

				if (
					Setting.value('showNoteCounts') &&
          !item.deleted_time &&
          item.id !== getTrashFolderId()
				) {
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
			const folderParentId = getDisplayParentId(
				folder,
				folders.find((f) => f.id === folder.parent_id),
			);
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
			const folderParentId = getDisplayParentId(
				folder,
				folders.find((f) => f.id === folder.parent_id),
			);
			if (folderParentId === folderId) return true;
		}
		return false;
	}

	public render() {
		if (this.updateItems_) {
			this.logger().debug(
				'Rebuilding items...',
				this.notesParentType,
				this.selectedJoplinItemId,
				this.selectedSearchId,
			);
			const wasSelectedItemId = this.selectedJoplinItemId;
			const previousParentType = this.notesParentType;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			let newItems: any[] = [];
			const orderFolders = (parentId: string) => {
				for (let i = 0; i < this.folders.length; i++) {
					const f = this.folders[i];
					const originalParent = this.folders_.find(
						(f) => f.id === f.parent_id,
					);

					const folderParentId = getDisplayParentId(f, originalParent); // f.parent_id ? f.parent_id : '';
					if (folderParentId === parentId) {
						newItems.push(f);
						// Only recurse into children if the folder is not collapsed
						if (
							this.folderHasChildren_(this.folders, f.id) &&
              !this.collapseService_.isCollapsed(f.id)
						) {
							orderFolders(f.id);
						}
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

	public toggleFolderCollapse() {
		const item = this.currentItem;
		if (
			item &&
      item.type_ === Folder.modelType() &&
      this.folderHasChildren_(this.folders, item.id)
		) {
			this.collapseService_.toggleCollapsed(item.id);
			this.updateItems_ = true;
			this.invalidate();
			return true;
		}
		return false;
	}

	// Getter for external access to collapse service
	public get collapseService() {
		return this.collapseService_;
	}

	public expandToFolder(folderId: string) {
		this.collapseService_.expandToFolder(folderId, this.folders);
		this.updateItems_ = true;
		this.invalidate();
	}

	public collapseAll() {
		for (const folder of this.folders) {
			if (this.folderHasChildren_(this.folders, folder.id)) {
				this.collapseService_.setCollapsed(folder.id, true);
			}
		}
		this.updateItems_ = true;
		this.invalidate();
	}

	public expandAll() {
		for (const folder of this.folders) {
			if (this.folderHasChildren_(this.folders, folder.id)) {
				this.collapseService_.setCollapsed(folder.id, false);
			}
		}
		this.updateItems_ = true;
		this.invalidate();
	}
}
