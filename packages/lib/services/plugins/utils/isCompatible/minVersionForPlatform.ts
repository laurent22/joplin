import { AppType } from '../../../../models/Setting';
import { ManifestSlice } from './types';

// Returns false if the platform isn't supported at all,
const minVersionForPlatform = (appPlatform: AppType, manifest: ManifestSlice): string|false => {
	const platforms = manifest.platforms ?? [];
	// If platforms is not specified (or empty), default to supporting all platforms.
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
