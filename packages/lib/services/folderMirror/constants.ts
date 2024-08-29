import { ModelType } from '../../BaseModel';
import { FolderEntity, NoteEntity, ResourceEntity } from '../database/types';
import { FolderItem } from './types';

export const resourcesDirName = 'resources';
export const resourceMetadataExtension = '.metadata.yml';
export const resourcesDirId = 'resource1resource1resource111111';
export const resourcesDirItem: FolderItem = {
	id: resourcesDirId,
	title: 'resources',
	parent_id: '',
	deleted_time: 0,
	virtual: true,
	type_: ModelType.Folder,
};

// These fields will be compared to determine whether an item has changed with respect to a remote item.
export const itemDiffFields: ((keyof NoteEntity)|(keyof FolderEntity)|(keyof ResourceEntity))[] = ['title', 'body', 'icon', 'blob_updated_time', 'is_todo', 'todo_completed'];
