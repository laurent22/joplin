import { FolderEntity, NoteEntity, ResourceEntity } from '../database/types';

export type ResourceItem = ResourceEntity & {
	// For compatibility.
	parent_id?: string;
	deleted_time?: number;
};

export type FolderItem = (FolderEntity | NoteEntity | ResourceItem) & { virtual?: boolean };
