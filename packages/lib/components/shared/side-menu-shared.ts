import Folder from '../../models/Folder';
import BaseModel from '../../BaseModel';
import { FolderEntity, TagEntity, TagsWithNoteCountEntity } from '../../services/database/types';
import { getDisplayParentId, getTrashFolderId } from '../../services/trash';
import { getCollator } from '../../models/utils/getCollator';

export type RenderFolderItem<T> = (folder: FolderEntity, hasChildren: boolean, depth: number)=> T;
export type RenderTagItem<T> = (tag: TagsWithNoteCountEntity)=> T;

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

interface FolderSelectedContext {
	selectedFolderId: string;
	notesParentType: string;
}
export const isFolderSelected = (folder: FolderEntity, context: FolderSelectedContext) => {
	return context.selectedFolderId === folder.id && context.notesParentType === 'Folder';
};


type ItemsWithOrder<ItemType> = {
	items: ItemType[];
	order: string[];
};

interface RenderFoldersProps {
	folders: FolderEntity[];
	collapsedFolderIds: string[];
}

function renderFoldersRecursive_<T>(props: RenderFoldersProps, renderItem: RenderFolderItem<T>, items: T[], parentId: string, depth: number, order: string[]): ItemsWithOrder<T> {
	const folders = props.folders;
	for (let i = 0; i < folders.length; i++) {
		const folder = folders[i];

		const folderParentId = getDisplayParentId(folder, props.folders.find(f => f.id === folder.parent_id));

		if (!Folder.idsEqual(folderParentId, parentId)) continue;
		if (folderIsCollapsed(props.folders, folder.id, props.collapsedFolderIds)) continue;
		const hasChildren = folderHasChildren_(folders, folder.id);
		order.push(folder.id);
		items.push(renderItem(folder, hasChildren, depth));
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

export const renderFolders = <T> (props: RenderFoldersProps, renderItem: RenderFolderItem<T>): ItemsWithOrder<T> => {
	return renderFoldersRecursive_(props, renderItem, [], '', 0, []);
};

const sortTags = (tags: TagEntity[]) => {
	tags = tags.slice();
	const collator = getCollator();
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
	return tags;
};

interface TagSelectedContext {
	selectedTagId: string;
	notesParentType: string;
}
export const isTagSelected = (tag: TagEntity, context: TagSelectedContext) => {
	return context.selectedTagId === tag.id && context.notesParentType === 'Tag';
};

export const renderTags = <T> (unsortedTags: TagsWithNoteCountEntity[], renderItem: RenderTagItem<T>): ItemsWithOrder<T> => {
	const tags = sortTags(unsortedTags);
	const tagItems = [];
	const order: string[] = [];
	for (let i = 0; i < tags.length; i++) {
		const tag = tags[i];
		order.push(tag.id);
		tagItems.push(renderItem(tag));
	}
	return {
		items: tagItems,
		order: order,
	};
};
