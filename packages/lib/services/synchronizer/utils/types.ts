import { RemoteItem } from '../../../file-api';

export enum Dirnames {
	Locks = 'locks',
	Resources = '.resource',
	Temp = 'temp',
}

export enum SyncAction {
	ItemConflict = 'itemConflict',
	NoteConflict = 'noteConflict',
	ResourceConflict = 'resourceConflict',
	CreateRemote = 'createRemote',
	UpdateRemote = 'updateRemote',
	DeleteRemote = 'deleteRemote',
	CreateLocal = 'createLocal',
	UpdateLocal = 'updateLocal',
	DeleteLocal = 'deleteLocal',
}

export type LogSyncOperationFunction = (action: SyncAction, local?: { id?: string; path?: string; type_?: number }, remote?: RemoteItem, message?: string, actionCount?: number)=> void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ApiCallFunction dispatches by method name across FileApi drivers with heterogeneous signatures (get/put/list/delete/multiPut/multiDelete/...)
export type ApiCallFunction = (fnName: string, ...args: any[])=> Promise<any>;

export const conflictActions: SyncAction[] = [SyncAction.ItemConflict, SyncAction.NoteConflict, SyncAction.ResourceConflict];
