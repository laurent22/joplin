import debounce from './debounce';

const { NativeModules, Platform } = require('react-native');

export interface SharedData {
	title?: string;
	text?: string;
	resources?: string[];
}

const ShareExtension = (NativeModules.ShareExtension) ?
	{
		data: () => NativeModules.ShareExtension.data(),
		close: () => debounce(() => NativeModules.ShareExtension.close(), 3 * 60 * 1000), // close it after 3 minutes
		shareURL: (Platform.OS === 'ios') ? NativeModules.ShareExtension.getConstants().SHARE_EXTENSION_SHARE_URL : '',
	} :
	{
		data: () => {},
		close: () => {},
		shareURL: '',
	};

export default ShareExtension;
