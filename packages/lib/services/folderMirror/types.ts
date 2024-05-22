import { FolderEntity, NoteEntity, ResourceEntity } from '../database/types';

export type FolderItem = FolderEntity | NoteEntity;
export type FolderOrResourceItem = FolderEntity | NoteEntity | ResourceEntity;
