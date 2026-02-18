import type FolderRecord from './FolderRecord';
import type NoteRecord from './NoteRecord';
import type ResourceRecord from './ResourceRecord';

export type ItemId = string;
export interface NoteData {
	parentId: ItemId;
	id: ItemId;
	title: string;
	body: string;
	published: boolean;
}
export interface DetailedNoteData extends NoteData {
	isShared: boolean;
}
export interface FolderData {
	parentId: ItemId;
	id: ItemId;
	title: string;
}
export interface DetailedFolderData extends FolderData {
	isShared: boolean;
}

export interface ResourceData {
	id: ItemId;
	title: string;
	mimeType: string;
}

export type TreeItem = NoteRecord | FolderRecord | ResourceRecord;

export const isFolder = (item: TreeItem): item is FolderRecord => {
	return 'childIds' in item;
};

export const isResource = (item: TreeItem): item is ResourceRecord => {
	return 'mimeType' in item;
};

export const isNote = (item: TreeItem): item is NoteRecord => {
	return !isFolder(item) && !isResource(item);
};
// Typescript type assertions require type definitions on the left for arrow functions.
// See https://github.com/microsoft/TypeScript/issues/53450.

export const assertIsFolder: (item: TreeItem)=> asserts item is FolderRecord = item => {
	if (!item) {
		throw new Error(`Item ${item} is not a folder`);
	}

	if (!isFolder(item)) {
		throw new Error(`Expected item with ID ${item?.id} to be a folder.`);
	}
};
export const assertIsNote: (item: TreeItem)=> asserts item is NoteRecord = item => {
	if (!item) throw new Error(`Item ${item} is not a note`);
	if (!isNote(item)) throw new Error(`Expected item with ID ${item?.id} to be a note.`);
};
// A less restrictive version of "assertIsNote"
export const assertIsNoteData: (item: NoteData|FolderData|ResourceData)=> asserts item is NoteData = item => {
	if (!item) throw new Error(`Item ${item} is not a note`);
	if ('childIds' in item) throw new Error(`Expected item with ID ${item?.id} to be a note, not a folder.`);
	if ('mimeType' in item) throw new Error(`Expected item with ID ${item?.id} to be a note, not a resource.`);
};
