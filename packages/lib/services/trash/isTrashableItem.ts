import { checkObjectHasProperties } from '@joplin/utils/object';
import { ModelType } from '../../BaseModel';
import isTrashableNoteOrFolder from './isTrashableNoteOrFolder';

type ItemSlice = { id?: string };
const isTrashableItem = (itemType: ModelType, item: ItemSlice) => {
	checkObjectHasProperties(item, ['id']);

	if (itemType !== ModelType.Folder && itemType !== ModelType.Note) {
		return false;
	}

	return isTrashableNoteOrFolder(item);
};

export default isTrashableItem;
