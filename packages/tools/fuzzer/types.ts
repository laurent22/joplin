import type Client from './Client';

export type Json = string|number|Json[]|{ [key: string]: Json };

export type HttpMethod = 'GET'|'POST'|'DELETE'|'PUT'|'PATCH';

export type ItemId = string;
export type NoteData = {
	parentId: ItemId;
	id: ItemId;
	title: string;
	body: string;
};
export type FolderMetadata = {
	parentId: ItemId;
	id: ItemId;
	title: string;
};
export type FolderData = FolderMetadata & {
	childIds: ItemId[];
	sharedWith: string[];
	// Email of the Joplin Server account that controls the item
	ownedByEmail: string;
};
export type TreeItem = NoteData|FolderData;

export const isFolder = (item: TreeItem): item is FolderData => {
	return 'childIds' in item;
};

// Typescript type assertions require type definitions on the left for arrow functions.
// See https://github.com/microsoft/TypeScript/issues/53450.
export const assertIsFolder: (item: TreeItem)=> asserts item is FolderData = item => {
	if (!item) {
		throw new Error(`Item ${item} is not a folder`);
	}

	if (!isFolder(item)) {
		throw new Error(`Expected item with ID ${item?.id} to be a folder.`);
	}
};

export interface FuzzContext {
	serverUrl: string;
	baseDir: string;
	execApi: (method: HttpMethod, route: string, debugAction: Json)=> Promise<Json>;
	randInt: (low: number, high: number)=> number;
}

export interface RandomFolderOptions {
	filter?: (folder: FolderData)=> boolean;
}

export interface ActionableClient {
	createFolder(data: FolderMetadata): Promise<void>;
	shareFolder(id: ItemId, shareWith: Client): Promise<void>;
	removeFromShare(id: string, shareWith: Client): Promise<void>;
	deleteFolder(id: ItemId): Promise<void>;
	createNote(data: NoteData): Promise<void>;
	updateNote(data: NoteData): Promise<void>;
	moveItem(itemId: ItemId, newParentId: ItemId): Promise<void>;
	sync(): Promise<void>;

	listNotes(): Promise<NoteData[]>;
	listFolders(): Promise<FolderMetadata[]>;
	allFolderDescendants(parentId: ItemId): Promise<ItemId[]>;
	randomFolder(options: RandomFolderOptions): Promise<FolderData>;
	randomNote(): Promise<NoteData>;
}

export interface UserData {
	email: string;
	password: string;
}

export type CleanupTask = ()=> Promise<void>;

