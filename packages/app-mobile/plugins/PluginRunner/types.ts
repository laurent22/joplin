
import ApiGlobal from '@joplin/lib/services/plugins/api/Global';
import { ButtonSpec } from '@joplin/lib/services/plugins/api/types';
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

export interface DialogMainProcessApi {
	postMessage: (message: SerializableData)=> Promise<SerializableData>;
	onMessage: (callback: (arg: SerializableData)=> void)=> void;
	onSubmit: (buttonId: string, formData: SerializableData)=> void;
	onDismiss: ()=> void;
	onError: (message: string)=> Promise<void>;
	onLog: (level: LogLevel, message: string)=> Promise<void>;
}

export interface DialogWebViewApi {
	getFormData: ()=> Promise<SerializableData>;
	setCss: (css: string)=> void;
	getContentSize: ()=> Promise<{ width: number; height: number }>;
	closeDialog: ()=> void;
	setButtons: (buttons: ButtonSpec[])=> void;
}
