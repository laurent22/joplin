const { NativeModules, Platform } = require('react-native');

export interface SharedData {
	title?: string,
	text?: string,
	resources?: string[]
}

const ShareExtension = (Platform.OS === 'android' && NativeModules.ShareExtension) ?
	{
		data: () => NativeModules.ShareExtension.data(),
		close: () => NativeModules.ShareExtension.close(),
	} :
	{
		data: () => {},
		close: () => {},
	};

export default ShareExtension;
