import { checkObjectHasProperties } from '@joplin/utils/object';
import conflictFolderId from '../../models/utils/getConflictFolderId';
import getTrashFolderId from './getTrashFolderId';

type ItemSlice = { id?: string };

// This function is separate from isTrashableItem to handle the case where we know that an item
// is either a note or a folder, but don't know which.
const isTrashableNoteOrFolder = (item: ItemSlice) => {
	checkObjectHasProperties(item, ['id']);
	return item.id !== conflictFolderId() && item.id !== getTrashFolderId();
};

export default isTrashableNoteOrFolder;
