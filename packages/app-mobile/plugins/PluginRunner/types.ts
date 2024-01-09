
import ApiGlobal from '@joplin/lib/services/plugins/api/Global';
import { ButtonSpec } from '@joplin/lib/services/plugins/api/types';
import { SerializableData } from '@joplin/lib/utils/ipc/types';


export interface PluginWebViewApi {

}

export interface PluginApi {
	api: ApiGlobal;
}

export interface DialogRemoteApi {
	postMessage: (message: SerializableData)=> Promise<SerializableData>;
	onMessage: (callback: (arg: SerializableData)=> void)=> void;
	onSubmit: (buttonId: string, formData: SerializableData)=> void;
	onDismiss: ()=> void;
}

export interface DialogLocalApi {
	getFormData: ()=> Promise<SerializableData>;
	setCss: (css: string)=> void;
	getContentSize: ()=> Promise<{ width: number; height: number }>;
	closeDialog: ()=> void;
	setButtons: (buttons: ButtonSpec[])=> void;
}
