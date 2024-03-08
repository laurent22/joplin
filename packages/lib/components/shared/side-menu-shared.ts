import Folder from '../../models/Folder';
import BaseModel from '../../BaseModel';
import { FolderEntity, TagEntity } from '../../services/database/types';
import { getDisplayParentId, getTrashFolderId } from '../../services/trash';
import Setting from '../../models/Setting';

interface Props {
	folders: FolderEntity[];
	selectedFolderId: string;
	notesParentType: string;
	collapsedFolderIds: string[];
	selectedTagId: string;
	tags?: TagEntity[];
}

export type RenderFolderItem = (folder: FolderEntity, selected: boolean, hasChildren: boolean, depth: number)=> any;
export type RenderTagItem = (tag: TagEntity, selected: boolean)=> any;

function folderHasChildren_(folders: FolderEntity[], folderId: string) {
	if (folderId === getTrashFolderId()) {
		return !!folders.find(f => !!f.deleted_time);
	}

	for (let i = 0; i < folders.length; i++) {
		const folder = folders[i];
		const folderParentId = getDisplayParentId(folder, folders.find(f => f.id === folder.parent_id));
		if (folderParentId === folderId) return true;
	}

	return false;
}

function folderIsCollapsed(folders: FolderEntity[], folderId: string, collapsedFolderIds: string[]) {
	if (!collapsedFolderIds || !collapsedFolderIds.length) return false;

	while (true) {
		const folder: FolderEntity = BaseModel.byId(folders, folderId);
		if (!folder) throw new Error(`No folder with id ${folder.id}`);
		const folderParentId = getDisplayParentId(folder, folders.find(f => f.id === folder.parent_id));
		if (!folderParentId) return false;
		if (collapsedFolderIds.indexOf(folderParentId) >= 0) return true;
		folderId = folderParentId;
	}
}

function renderFoldersRecursive_(props: Props, renderItem: RenderFolderItem, items: any[], parentId: string, depth: number, order: string[]) {
	const folders = props.folders;
	for (let i = 0; i < folders.length; i++) {
		const folder = folders[i];

		const folderParentId = getDisplayParentId(folder, props.folders.find(f => f.id === folder.parent_id));

		if (!Folder.idsEqual(folderParentId, parentId)) continue;
		if (folderIsCollapsed(props.folders, folder.id, props.collapsedFolderIds)) continue;
		const hasChildren = folderHasChildren_(folders, folder.id);
		order.push(folder.id);
		items.push(renderItem(folder, props.selectedFolderId === folder.id && props.notesParentType === 'Folder', hasChildren, depth));
		if (hasChildren) {
			const result = renderFoldersRecursive_(props, renderItem, items, folder.id, depth + 1, order);
			items = result.items;
			order = result.order;
		}
	}
	return {
		items: items,
		order: order,
	};
}

export const renderFolders = (props: Props, renderItem: RenderFolderItem) => {
	return renderFoldersRecursive_(props, renderItem, [], '', 0, []);
};

export const renderTags = (props: Props, renderItem: RenderTagItem) => {
	const tags = props.tags.slice();
	const collatorLocale = Setting.value('locale').slice(0, 2);
	const collator = new Intl.Collator(collatorLocale, { numeric: true, sensitivity: 'base' });
	tags.sort((a, b) => {
		// It seems title can sometimes be undefined (perhaps when syncing
		// and before tag has been decrypted?). It would be best to find
		// the root cause but for now that will do.
		//
		// Fixes https://github.com/laurent22/joplin/issues/4051
		if (!a || !a.title || !b || !b.title) return 0;

		// Note: while newly created tags are normalized and lowercase
		// imported tags might be any case, so we need to do case-insensitive
		// sort.
		return collator.compare(a.title, b.title);
	});
	const tagItems = [];
	const order: string[] = [];
	for (let i = 0; i < tags.length; i++) {
		const tag = tags[i];
		order.push(tag.id);
		tagItems.push(renderItem(tag, props.selectedTagId === tag.id && props.notesParentType === 'Tag'));
	}
	return {
		items: tagItems,
		order: order,
	};
};
