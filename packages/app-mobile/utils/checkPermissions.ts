import Logger from '@joplin/lib/Logger';

const { Platform, PermissionsAndroid } = require('react-native');
const logger = Logger.create('checkPermissions');

type rationale = {
	title: string;
	message: string;
	buttonPositive?: string;
	buttonNegative?: string;
	buttonNeutral?: string;
};

export default async (permissions: string, rationale?: rationale) => {
	// On iOS, permissions are prompted for by the system, so here we assume it's granted.
	if (Platform.OS !== 'android') return PermissionsAndroid.RESULTS.GRANTED;

	let result = await PermissionsAndroid.check(permissions);
	logger.info('Checked permission:', result);
	if (result !== PermissionsAndroid.RESULTS.GRANTED) {
		result = await PermissionsAndroid.request(permissions, rationale);
		logger.info('Requested permission:', result);
	}
	return result;
};
