import { compareVersions } from 'compare-versions';
import { AppType } from '../../api/types';
import minVersionForPlatform from './minVersionForPlatform';
import { ManifestSlice } from './types';

const isVersionCompatible = (appVersion: string, manifestMinVersion: string) => {
	return compareVersions(appVersion, manifestMinVersion) >= 0;
};

const isCompatible = (appVersion: string, appType: AppType, manifest: ManifestSlice): boolean => {
	const minVersion = minVersionForPlatform(appType, manifest);
	return minVersion && isVersionCompatible(appVersion, minVersion);
};

export default isCompatible;
