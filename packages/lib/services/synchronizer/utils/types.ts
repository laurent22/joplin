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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export type LogSyncOperationFunction = (action: SyncAction, local?: any, remote?: RemoteItem, message?: string, actionCount?: number)=> void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export type ApiCallFunction = (fnName: string, ...args: any[])=> Promise<any>;

export const conflictActions: SyncAction[] = [SyncAction.ItemConflict, SyncAction.NoteConflict, SyncAction.ResourceConflict];
