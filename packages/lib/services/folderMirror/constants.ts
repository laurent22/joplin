import { ModelType } from '../../BaseModel';
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
