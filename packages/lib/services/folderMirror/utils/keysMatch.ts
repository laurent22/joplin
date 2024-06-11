import { FolderEntity, NoteEntity, ResourceEntity } from '../../database/types';
import { FolderItem } from '../types';

const keysMatch = (localItem: FolderItem, remoteItem: FolderItem, keys: ((keyof FolderEntity)|(keyof NoteEntity)|(keyof ResourceEntity))[]) => {
	for (const key of keys) {
		if (key in localItem !== key in remoteItem) {
			return false;
		}
		if (key in localItem && localItem[key as keyof typeof localItem] !== remoteItem[key as keyof typeof remoteItem]) {
			return false;
		}
	}
	return true;
};

export default keysMatch;
