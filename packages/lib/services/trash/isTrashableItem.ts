import { ModelType } from '../../BaseModel';
import conflictFolderId from '../../models/utils/getConflictFolderId';
import getTrashFolderId from './getTrashFolderId';

type ItemSlice = { id?: string; type_?: number };
const isTrashableItem = (item: ItemSlice) => {
	if (item.type_ !== ModelType.Folder && item.type_ !== ModelType.Note) {
		return false;
	}

	return item.id !== conflictFolderId() && item.id !== getTrashFolderId();
};

export default isTrashableItem;
