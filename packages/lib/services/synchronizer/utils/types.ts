import { RemoteItem } from '../../../file-api';

export enum Dirnames {
	Locks = 'locks',
	Resources = '.resource',
	Temp = 'temp',
}

export type LogSyncOperationFunction = (action: string, local?: any, remote?: RemoteItem, message?: string, actionCount?: number)=> void;

export type ApiCallFunction = (fnName: string, ...args: any[])=> Promise<any>;
