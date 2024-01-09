
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
	onMessage: (message: SerializableData)=> Promise<SerializableData>;
	onSubmit: (formData: SerializableData)=> void;
	onDismiss: ()=> void;
}

export interface DialogLocalApi {
	getFormData: ()=> Promise<SerializableData>;
	addCss: (css: string)=> void;
	closeDialog: ()=> void;
	setButtons: (buttons: ButtonSpec[])=> void;
}
