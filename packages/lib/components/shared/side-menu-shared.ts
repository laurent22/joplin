import { FolderEntity, TagEntity, TagsWithNoteCountEntity } from '../../services/database/types';
import { getDisplayParentId } from '../../services/trash';
import { getCollator } from '../../models/utils/getCollator';

export type RenderFolderItem<T> = (folder: FolderEntity, hasChildren: boolean, depth: number)=> T;
export type RenderTagItem<T> = (tag: TagsWithNoteCountEntity)=> T;

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

interface FolderTree {
	folders: FolderEntity[];
	parentIdToChildren: Map<string, FolderEntity[]>;
	idToItem: Map<string, FolderEntity>;
}

interface RenderFoldersProps {
	folderTree: FolderTree;
	collapsedFolderIds: string[];
}

function folderIsCollapsed(context: RenderFoldersProps, folderId: string) {
	if (!context.collapsedFolderIds || !context.collapsedFolderIds.length) return false;

	while (true) {
		const folder = context.folderTree.idToItem.get(folderId);
		const folderParentId = getDisplayParentId(folder, context.folderTree.idToItem.get(folder.parent_id));
		if (!folderParentId) return false;
		if (context.collapsedFolderIds.includes(folderParentId)) return true;
		folderId = folderParentId;
	}
}

function renderFoldersRecursive_<T>(props: RenderFoldersProps, renderItem: RenderFolderItem<T>, items: T[], parentId: string, depth: number, order: string[]): ItemsWithOrder<T> {
	const folders = props.folderTree.parentIdToChildren.get(parentId ?? '') ?? [];
	const parentIdToChildren = props.folderTree.parentIdToChildren;
	for (const folder of folders) {
		if (folderIsCollapsed(props, folder.id)) continue;

		const hasChildren = parentIdToChildren.has(folder.id);
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

export const buildFolderTree = (folders: FolderEntity[]): FolderTree => {
	const idToItem = new Map<string, FolderEntity>();
	for (const folder of folders) {
		idToItem.set(folder.id, folder);
	}

	const parentIdToChildren = new Map<string, FolderEntity[]>();
	for (const folder of folders) {
		const displayParentId = getDisplayParentId(folder, idToItem.get(folder.parent_id)) ?? '';
		if (!parentIdToChildren.has(displayParentId)) {
			parentIdToChildren.set(displayParentId, []);
		}
		parentIdToChildren.get(displayParentId).push(folder);
	}

	return { folders, parentIdToChildren, idToItem };
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
