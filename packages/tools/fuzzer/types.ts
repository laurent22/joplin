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
	isShareRoot: boolean;
};
export type TreeItem = NoteData|FolderData;

export const isFolder = (item: TreeItem): item is FolderData => {
	return 'childIds' in item;
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
	deleteFolder(id: ItemId): Promise<void>;
	createNote(data: NoteData): Promise<void>;
	updateNote(data: NoteData): Promise<void>;
	moveItem(itemId: ItemId, newParentId: ItemId): Promise<void>;
	sync(): Promise<void>;

	listNotes(): Promise<NoteData[]>;
	listFolders(): Promise<FolderMetadata[]>;
	allFolderDescendants(parentId: ItemId): Promise<ItemId[]>;
	randomFolder(options: RandomFolderOptions): Promise<FolderMetadata>;
	randomNote(): Promise<NoteData>;
}

export interface UserData {
	email: string;
	password: string;
}

export type CleanupTask = ()=> Promise<void>;

