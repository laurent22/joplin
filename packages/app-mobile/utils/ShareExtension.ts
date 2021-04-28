const { NativeModules, Platform } = require('react-native');

export interface SharedData {
	title?: string;
	text?: string;
	resources?: string[];
}

const ShareExtension = (NativeModules.ShareExtension) ?
	{
		data: () => NativeModules.ShareExtension.data(),
		close: () => NativeModules.ShareExtension.close(),
		shareURL: (Platform.OS === 'ios') ? NativeModules.ShareExtension.getConstants().SHARE_EXTENSION_SHARE_URL : '',
	} :
	{
		data: () => {},
		close: () => {},
		shareURL: '',
	};

export default ShareExtension;
