
import ApiGlobal from '@joplin/lib/services/plugins/api/Global';
import { ButtonSpec } from '@joplin/lib/services/plugins/api/types';
import { SerializableData } from '@joplin/lib/utils/ipc/types';


export interface PluginWebViewApi {

}

export interface PluginMainProcessApi {
	api: ApiGlobal;
	onError: (message: string)=> Promise<void>;
}

export interface DialogMainProcessApi {
	postMessage: (message: SerializableData)=> Promise<SerializableData>;
	onMessage: (callback: (arg: SerializableData)=> void)=> void;
	onSubmit: (buttonId: string, formData: SerializableData)=> void;
	onDismiss: ()=> void;
	onError: (message: string)=> Promise<void>;
}

export interface DialogWebViewApi {
	getFormData: ()=> Promise<SerializableData>;
	setCss: (css: string)=> void;
	getContentSize: ()=> Promise<{ width: number; height: number }>;
	closeDialog: ()=> void;
	setButtons: (buttons: ButtonSpec[])=> void;
}
