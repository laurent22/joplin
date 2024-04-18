import { checkObjectHasProperties } from '@joplin/utils/object';
import { ModelType } from '../../BaseModel';
import { _ } from '../../locale';
import { FolderEntity, FolderIcon, FolderIconType, NoteEntity } from '../database/types';
import Folder from '../../models/Folder';
import getTrashFolderId from './getTrashFolderId';

// When an item is deleted, all its properties are kept, including the parent ID
// so that it can potentially be restored to the right folder. However, when
// displaying that item, we should make sure it has the right parent, which may
// be different from the parent ID. For example, if we delete a note, the new
// parent is the trash folder. If we delete a folder, the folder parent is the
// trash folder, while the note parents are still the folder (since it is in the
// trash too).
//
// This function simplifies this logic wherever it is needed.
//
// `originalItemParent` is the parent before the item was deleted, which is the
// folder with ID = item.parent_id
export const getDisplayParentId = (item: FolderEntity | NoteEntity, originalItemParent: FolderEntity) => {
	if (!('parent_id' in item)) throw new Error(`Missing "parent_id" property: ${JSON.stringify(item)}`);

	if (!('deleted_time' in item)) {
		throw new Error(`Missing "deleted_time" property: ${JSON.stringify(item)}`);
	}
	if (originalItemParent && !('deleted_time' in originalItemParent)) {
		throw new Error(`Missing "deleted_time" property: ${JSON.stringify(originalItemParent)}`);
	}

	if (!item.deleted_time) return item.parent_id;

	if (!originalItemParent || !originalItemParent.deleted_time) return getTrashFolderId();

	return item.parent_id;
};

export const getDisplayParentTitle = (item: FolderEntity | NoteEntity, originalItemParent: FolderEntity) => {
	const displayParentId = getDisplayParentId(item, originalItemParent);
	if (displayParentId === getTrashFolderId()) return getTrashFolderTitle();
	return originalItemParent && originalItemParent.id === displayParentId ? originalItemParent.title : '';
};

export const getTrashFolderTitle = () => {
	return _('Trash');
};

export const getTrashFolder = (): FolderEntity => {
	const now = Date.now();

	return {
		type_: ModelType.Folder,
		id: getTrashFolderId(),
		parent_id: '',
		title: getTrashFolderTitle(),
		updated_time: now,
		user_updated_time: now,
		share_id: '',
		is_shared: 0,
		deleted_time: 0,
	};
};

export const getTrashFolderIcon = (type: FolderIconType): FolderIcon => {
	if (type === FolderIconType.FontAwesome) {
		return {
			dataUrl: '',
			emoji: '',
			name: 'fas fa-trash',
			type: FolderIconType.FontAwesome,
		};
	} else {
		return {
			dataUrl: '',
			emoji: '🗑️',
			name: '',
			type: FolderIconType.Emoji,
		};
	}
};

export const itemIsInTrash = (item: FolderEntity | NoteEntity) => {
	if (!item) return false;
	checkObjectHasProperties(item, ['id', 'deleted_time']);
	return item.id === getTrashFolderId() || !!item.deleted_time;
};

export const getRestoreFolder = async () => {
	const title = _('Restored items');
	const output = await Folder.loadByTitleAndParent(title, '');
	if (output) return output;
	return Folder.save({ title });
};

export { getTrashFolderId };
