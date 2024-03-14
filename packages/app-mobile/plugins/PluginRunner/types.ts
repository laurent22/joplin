
import ApiGlobal from '@joplin/lib/services/plugins/api/Global';
import { SerializableData } from '@joplin/lib/utils/ipc/types';

export enum LogLevel {
	Error = 'error',
	Warn = 'warn',
	Info = 'info',
	Debug = 'debug',
}

export interface PluginMainProcessApi {
	api: ApiGlobal;
	onError: (message: string)=> Promise<void>;
	onLog: (level: LogLevel, message: string)=> Promise<void>;
}

export interface PluginWebViewApi {

}

// Similar to PluginViewState, but with loaded scripts (rather than
// paths to scripts).
export interface DialogInfo {
	id: string;
	opened: boolean;
	fitToContent: boolean;
	contentScripts: string[];
	contentCss: string[];
	html: string;
}

export type WebViewOnMessageCallback = (arg: SerializableData)=> void;

export interface DialogMainProcessApi {
	postMessage: (message: SerializableData)=> Promise<SerializableData>;
	onMessage: (callback: WebViewOnMessageCallback)=> void;
	onError: (message: string)=> Promise<void>;
	onLog: (level: LogLevel, message: string)=> Promise<void>;
}

export interface DialogContentSize {
	width: number;
	height: number;
}

export interface DialogWebViewApi {
	// Note: Includes any path at most once (calling again with the same paths
	//       does not reload styles/scripts).
	includeCssFiles: (paths: string[])=> Promise<void>;
	includeJsFiles: (paths: string[])=> Promise<void>;

	setThemeCss: (css: string)=> Promise<void>;
	getFormData: ()=> Promise<SerializableData>;
	getContentSize: ()=> Promise<DialogContentSize>;
}
