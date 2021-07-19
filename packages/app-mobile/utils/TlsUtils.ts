const { Platform, NativeModules } = require('react-native');

export default async function setIgnoreTlsErrors(ignore: boolean): Promise<boolean> {
	if (Platform.OS === 'android') {
		return await NativeModules.SslModule.setIgnoreTlsErrors(ignore);
	} else {
		return false;
	}
}
