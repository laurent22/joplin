import { AppType } from '../../api/types';
import { ManifestSlice } from './types';

// Returns false if the platform isn't supported at all,
const minVersionForPlatform = (appPlatform: AppType, manifest: ManifestSlice): string|false => {
	if (!manifest.platforms?.length) {
		return manifest.app_min_version;
	}

	for (const platform of manifest.platforms) {
		if (platform === appPlatform) {
			return manifest.app_min_version;
		} else if (platform.startsWith(appPlatform)) {
			// Check for a version specifier, but don't fail if one isn't present. It's possible
			// the platform is one unknown by the current version of Joplin (e.g. "web" or "mobile-ios").
			const versionSpecifier = platform.match(/>=([0-9.]+)$/);
			if (versionSpecifier) {
				return versionSpecifier[1];
			}
		}
	}

	return false;
};

export default minVersionForPlatform;
