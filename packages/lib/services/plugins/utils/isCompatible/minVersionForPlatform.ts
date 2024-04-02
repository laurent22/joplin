import { AppType } from '../../../../models/Setting';
import { ManifestSlice } from './types';

// Returns false if the platform isn't supported at all,
const minVersionForPlatform = (appPlatform: AppType, manifest: ManifestSlice): string|false => {
	if (manifest.platforms && !manifest.platforms.includes(appPlatform)) {
		return false;
	}

	if (appPlatform === AppType.Mobile && !!manifest.app_min_version_mobile) {
		return manifest.app_min_version_mobile;
	}

	return manifest.app_min_version;
};

export default minVersionForPlatform;
