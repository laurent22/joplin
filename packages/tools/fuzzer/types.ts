import type Client from './ipc/Client';
import type FolderRecord from './model/FolderRecord';
import { NoteData, FolderData, ItemId, ResourceData, DetailedFolderData, TreeItem } from './model/types';

export type Json = string|boolean|number|Json[]|{ [key: string]: Json };

export type HttpMethod = 'GET'|'POST'|'DELETE'|'PUT'|'PATCH';

export interface FuzzContext {
	serverUrl: string;
	isJoplinCloud: boolean;
	keepAccounts: boolean;
	enableE2ee: boolean;
	baseDir: string;

	randInt: (low: number, high: number)=> number;
	randomString: (targetLength: number)=> string;
	randomId: ()=> string;
	randomFrom: <T> (data: T[])=> T;

	execApi(method: HttpMethod, route: string, body: Json|undefined): Promise<Json>;
}

export interface RandomFolderOptions {
	includeReadOnly: boolean;
	filter?: (folder: FolderRecord)=> boolean;
}

export interface RandomNoteOptions {
	includeReadOnly: boolean;
	filter?: (note: NoteData)=> boolean;
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

