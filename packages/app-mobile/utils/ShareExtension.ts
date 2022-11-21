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
		// we debounce the `close` method, to keep alive permissions of Uris received from the share activity
		// this is to prevent getting permission denied error while sharing the same file to joplin multiple times in a row
		close: () => debounce(() => NativeModules.ShareExtension.close(), 3 * 60 * 1000), // close it after 3 minutes
		shareURL: (Platform.OS === 'ios') ? NativeModules.ShareExtension.getConstants().SHARE_EXTENSION_SHARE_URL : '',
	} :
	{
		data: () => {},
		close: () => {},
		shareURL: '',
	};

export default ShareExtension;
