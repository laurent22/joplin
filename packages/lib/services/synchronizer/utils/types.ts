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

export type LogSyncOperationFunction = (action: SyncAction, local?: any, remote?: RemoteItem, message?: string, actionCount?: number)=> void;

export type ApiCallFunction = (fnName: string, ...args: any[])=> Promise<any>;

export const conflictActions: SyncAction[] = [SyncAction.ItemConflict, SyncAction.NoteConflict, SyncAction.ResourceConflict];
