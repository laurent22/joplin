const { PermissionsAndroid } = require('react-native');

export default async (permissions: string) => {
	let result = await PermissionsAndroid.check(permissions);
	if (result !== PermissionsAndroid.RESULTS.GRANTED) {
		result = await PermissionsAndroid.request(permissions);
	}
	return result === PermissionsAndroid.RESULTS.GRANTED;
};
