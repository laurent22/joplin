import { ModelType } from '../../BaseModel';
import { _ } from '../../locale';
import { FolderEntity, NoteEntity } from '../database/types';

// When an item is deleted, all its properties are kept, including the parent ID
// so that it can potentially be restored to the right folder. However, when
// displaying that item, we should make sure it has the right parent, which may
// be different from the parent ID. For example, if we delete a note, the new
// parent is the trash folder. If we delete a folder, the folder parent is the
// trash folder, while the note parents are still the folder (since it is in the
// trash too).
//
// This function simplifies this logic wherever it is needed.
export const getDisplayParentId = (item: FolderEntity | NoteEntity, itemParent: FolderEntity) => {
	if (!('deleted_time' in item) || !('parent_id' in item)) throw new Error(`Missing "deleted_time" or "parent_id" property: ${JSON.stringify(item)}`);
	if (!('deleted_time' in itemParent)) throw new Error(`Missing "deleted_time" property: ${JSON.stringify(itemParent)}`);

	if (!item.deleted_time) return item.parent_id;

	if (!itemParent || !itemParent.deleted_time) return getTrashFolderId();

	return item.parent_id;
};

export const getTrashFolderId = () => {
	return 'de1e7ede1e7ede1e7ede1e7ede1e7ede';
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
	};
};
