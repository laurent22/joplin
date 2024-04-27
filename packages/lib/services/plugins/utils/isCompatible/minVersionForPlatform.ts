import { AppType } from '../../../../models/Setting';
import getDefaultPlatforms from './getDefaultPlatforms';
import { ManifestSlice } from './types';

// Returns false if the platform isn't supported at all,
const minVersionForPlatform = (appPlatform: AppType, manifest: ManifestSlice): string|false => {
	let platforms = manifest.platforms;

	if (!platforms || platforms.length === 0) {
		platforms = getDefaultPlatforms(manifest.id);
	}

	const supported = platforms.length === 0 || platforms.includes(appPlatform);
	if (!supported) {
		return false;
	}

	if (appPlatform === AppType.Mobile && !!manifest.app_min_version_mobile) {
		return manifest.app_min_version_mobile;
	}

	return manifest.app_min_version;
};

export default minVersionForPlatform;
