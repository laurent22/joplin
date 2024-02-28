import Folder from '../../models/Folder';
import BaseModel from '../../BaseModel';
import { FolderEntity, TagEntity } from '../../services/database/types';
import { Theme } from '../../themes/type';

interface Props {
	folders: FolderEntity[];
	selectedFolderId: string;
	notesParentType: string;
	collapsedFolderIds: string[];
	selectedTagId: string;
	tags?: TagEntity[];
}

type RenderFolderItem = (folder: FolderEntity, selected: boolean, hasChildren: boolean, depth: number)=> any;
type RenderTagItem = (tag: TagEntity, selected: boolean)=> any;

function folderHasChildren_(folders: FolderEntity[], folderId: string) {
	for (let i = 0; i < folders.length; i++) {
		const folder = folders[i];
		if (folder.parent_id === folderId) return true;
	}
	return false;
}

function folderIsVisible(folders: FolderEntity[], folderId: string, collapsedFolderIds: string[]) {
	if (!collapsedFolderIds || !collapsedFolderIds.length) return true;

	while (true) {
		const folder = BaseModel.byId(folders, folderId);
		if (!folder) throw new Error(`No folder with id ${folder.id}`);
		if (!folder.parent_id) return true;
		if (collapsedFolderIds.indexOf(folder.parent_id) >= 0) return false;
		folderId = folder.parent_id;
	}
}

function renderFoldersRecursive_(props: Props, renderItem: RenderFolderItem, renderAllNotesItem: any, allNotesSelected: boolean, theme: Theme, items: any[], parentId: string, depth: number, order: string[]) {
	const folders = props.folders;
	for (let i = 0; i < folders.length; i++) {
		const folder = folders[i];
		if (!Folder.idsEqual(folder.parent_id, parentId)) continue;
		if (!folderIsVisible(props.folders, folder.id, props.collapsedFolderIds)) continue;
		const hasChildren = folderHasChildren_(folders, folder.id);
		order.push(folder.id);
		if (folder.title === 'All Notes') {
			items.push(renderAllNotesItem(theme, folder, allNotesSelected));
		} else {
			items.push(renderItem(folder, props.selectedFolderId === folder.id && props.notesParentType === 'Folder', hasChildren, depth));

		}
		if (hasChildren) {
			const result = renderFoldersRecursive_(props, renderItem, renderAllNotesItem, allNotesSelected, theme, items, folder.id, depth + 1, order);
			items = result.items;
			order = result.order;
		}
	}
	return {
		items: items,
		order: order,
	};
}

export const renderFolders = (props: Props, renderItem: RenderFolderItem, renderAllNotesItem: any, allNotesSelected: boolean, theme: Theme) => {
	return renderFoldersRecursive_(props, renderItem, renderAllNotesItem, allNotesSelected, theme, [], '', 0, []);
};

export const renderTags = (props: Props, renderItem: RenderTagItem) => {
	const tags = props.tags.slice();
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
		return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : +1;
	});
	const tagItems = [];
	const order = [];
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
