import type Client from './Client';
import type FolderRecord from './model/FolderRecord';
import ResourceRecord from './model/ResourceRecord';

export type Json = string|number|Json[]|{ [key: string]: Json };

export type HttpMethod = 'GET'|'POST'|'DELETE'|'PUT'|'PATCH';

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

export type TreeItem = NoteData|FolderRecord|ResourceRecord;

export const isFolder = (item: TreeItem): item is FolderRecord => {
	return 'childIds' in item;
};

export const isResource = (item: TreeItem): item is ResourceRecord => {
	return 'mimeType' in item;
};

export const isNote = (item: TreeItem): item is NoteData => {
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
export const assertIsNote: (item: TreeItem)=> asserts item is NoteData = item => {
	if (!item) throw new Error(`Item ${item} is not a note`);
	if (isFolder(item)) throw new Error(`Expected item with ID ${item?.id} to be a note.`);
};

export interface FuzzContext {
	serverUrl: string;
	isJoplinCloud: boolean;
	keepAccounts: boolean;
	enableE2ee: boolean;
	baseDir: string;

	execApi: (method: HttpMethod, route: string, debugAction: Json)=> Promise<Json>;
	randInt: (low: number, high: number)=> number;
	randomString: (targetLength: number)=> string;
	randomId: ()=> string;
	randomFrom: <T> (data: T[])=> T;
}

export interface RandomFolderOptions {
	includeReadOnly: boolean;
	filter?: (folder: FolderRecord)=> boolean;
}

export interface RandomNoteOptions {
	includeReadOnly: boolean;
}

export interface ShareOptions {
	readOnly: boolean;
}

export interface ActionableClient {
	createFolder(data: FolderData): Promise<void>;
	shareFolder(id: ItemId, shareWith: Client, options: ShareOptions): Promise<void>;
	removeFromShare(id: string, shareWith: Client): Promise<void>;
	deleteAssociatedShare(id: string): Promise<void>;
	deleteFolder(id: ItemId): Promise<void>;
	deleteNote(id: ItemId): Promise<void>;
	createNote(data: NoteData): Promise<void>;
	updateNote(data: NoteData): Promise<void>;
	attachResource(note: NoteData, resource: ResourceData): Promise<NoteData>;
	createResource(resource: ResourceData): Promise<void>;
	moveItem(itemId: ItemId, newParentId: ItemId): Promise<void>;
	publishNote(id: ItemId): Promise<void>;
	unpublishNote(id: ItemId): Promise<void>;
	sync(): Promise<void>;

	listNotes(): Promise<NoteData[]>;
	listFolders(): Promise<DetailedFolderData[]>;
	listResources(): Promise<ResourceData[]>;
	allFolderDescendants(parentId: ItemId): Promise<ItemId[]>;
	randomFolder(options: RandomFolderOptions): Promise<FolderRecord>;
	randomNote(options: RandomNoteOptions): Promise<NoteData>;
	itemById(id: ItemId): TreeItem;
	itemExists(id: ItemId): boolean;
}

export interface UserData {
	email: string;
	password: string;
}

export type CleanupTask = ()=> Promise<void>;

