import { checkObjectHasProperties } from '@joplin/utils/object';
import { ModelType } from '../../BaseModel';
import conflictFolderId from '../../models/utils/getConflictFolderId';
import getTrashFolderId from './getTrashFolderId';

type ItemSlice = { id?: string };
const isTrashableItem = (itemType: ModelType, item: ItemSlice) => {
	checkObjectHasProperties(item, ['id']);

	if (itemType !== ModelType.Folder && itemType !== ModelType.Note) {
		return false;
	}

	return item.id !== conflictFolderId() && item.id !== getTrashFolderId();
};

export default isTrashableItem;
