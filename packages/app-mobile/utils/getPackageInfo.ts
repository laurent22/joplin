import shim from '@joplin/lib/shim';
import { PackageInfo } from '@joplin/lib/versionInfo';
import ReactNativeVersionInfo from 'react-native-version-info';
const basePackageInfo = require('../packageInfo.js');

const getPackageInfo = (): PackageInfo => {
	const version = shim.appVersion();
	return {
		...basePackageInfo,

		// Android, iOS, and Web have independent versions -- fetch this
		// information at runtime:
		name: 'Joplin Mobile',
		version,
		build: {
			appId: ReactNativeVersionInfo.bundleIdentifier,
		},
	};
};

export default getPackageInfo;
