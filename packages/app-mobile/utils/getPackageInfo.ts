import shim from '@joplin/lib/shim';
import { PackageInfo } from '@joplin/lib/versionInfo';
import ReactNativeVersionInfo from 'react-native-version-info';

const getPackageInfo = (): PackageInfo => {
	const version = shim.appVersion();
	return {
		description: 'Joplin for Mobile',
		name: 'Joplin',
		version,
		build: {
			appId: ReactNativeVersionInfo.bundleIdentifier,
		},
	};
};

export default getPackageInfo;
