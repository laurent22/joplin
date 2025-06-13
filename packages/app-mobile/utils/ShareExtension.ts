import { NativeEventEmitter } from 'react-native';
import { NativeModules, Platform } from 'react-native';

export interface SharedData {
	title?: string;
	text?: string;
	resources?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
type ShareListener = (event: any)=> void;
export type UnsubscribeShareListener = ()=> void;
type ShareExtensionType = {
	data: ()=> Promise<SharedData>;
	close: ()=> void;
	shareURL: ()=> string;
	addShareListener: (listener: ShareListener)=> UnsubscribeShareListener|undefined;
};


let eventEmitter: NativeEventEmitter | undefined;

const ShareExtension: ShareExtensionType = (NativeModules.ShareExtension) ?
	{
		data: () => NativeModules.ShareExtension.data(),
		close: () => NativeModules.ShareExtension.close(),
		shareURL: (Platform.OS === 'ios') ? NativeModules.ShareExtension.getConstants().SHARE_EXTENSION_SHARE_URL : '',
		addShareListener: (Platform.OS === 'android') ? ((handler) => {
			if (!eventEmitter) {
				eventEmitter = new NativeEventEmitter(NativeModules.ShareExtension);
			}
			return eventEmitter.addListener('new_share_intent', handler).remove;
		}) : (() => undefined),
	} :
	{
		data: () => {},
		close: () => {},
		shareURL: '',
		addShareListener: () => undefined,
	};

export default ShareExtension;
