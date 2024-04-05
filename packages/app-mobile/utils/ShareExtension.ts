import { NativeEventEmitter } from 'react-native';

const { NativeModules, Platform } = require('react-native');

export interface SharedData {
	title?: string;
	text?: string;
	resources?: string[];
}

let eventEmitter: NativeEventEmitter | undefined;

const ShareExtension = (NativeModules.ShareExtension) ?
	{
		data: () => NativeModules.ShareExtension.data(),
		close: () => NativeModules.ShareExtension.close(),
		shareURL: (Platform.OS === 'ios') ? NativeModules.ShareExtension.getConstants().SHARE_EXTENSION_SHARE_URL : '',
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		addShareListener: (Platform.OS === 'android') ? ((handler: (event: any)=> void) => {
			if (!eventEmitter) {
				eventEmitter = new NativeEventEmitter(NativeModules.ShareExtension);
			}
			return eventEmitter.addListener('new_share_intent', handler).remove;
		}) : (() => {}),
	} :
	{
		data: () => {},
		close: () => {},
		shareURL: '',
		addShareListener: () => {},
	};

export default ShareExtension;
