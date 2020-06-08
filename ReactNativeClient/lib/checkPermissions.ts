const { Platform, PermissionsAndroid } = require('react-native');

type rationale = {
	title: string,
	message: string,
	buttonPositive: string,
	buttonNegative?: string
	buttonNeutral?: string
}

export default async (permissions: string, rationale?: rationale) => {
	if (Platform.OS !== 'android') return true;

	let result = await PermissionsAndroid.check(permissions);
	if (result !== PermissionsAndroid.RESULTS.GRANTED) {
		result = await PermissionsAndroid.request(permissions, rationale);
	}
	return result === PermissionsAndroid.RESULTS.GRANTED;
};
