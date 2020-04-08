const { NativeModules, Platform } = require('react-native');

const ext = (Platform.OS === 'android' && NativeModules.ShareExtension) ?
	{
		data: () => NativeModules.ShareExtension.data(),
		close: () => NativeModules.ShareExtension.close(),
	} :
	{
		data: () => {},
		close: () => {},
	};

export default ext;
