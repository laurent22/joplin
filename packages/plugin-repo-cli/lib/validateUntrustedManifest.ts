import validatePluginId from '@joplin/lib/services/plugins/utils/validatePluginId';
import validatePluginVersion from '@joplin/lib/services/plugins/utils/validatePluginVersion';
import validatePluginPlatforms from '@joplin/lib/services/plugins/utils/validatePluginPlatforms';
import checkIfPluginCanBeAdded from './checkIfPluginCanBeAdded';

// Assumes that
// 1. manifest._npm_package_name is correct,
// 2. other fields were set by the plugin author and are thus untrusted.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const validateUntrustedManifest = (manifest: any, existingManifests: any) => {
	// At this point, we need to check the manifest ID as it's used in various
	// places including as directory name and object key in manifests.json, so
	// it needs to be correct. It's mostly for security reasons. The other
	// manifest properties are checked when the plugin is loaded into the app.
	validatePluginId(manifest.id);
	validatePluginVersion(manifest.version);
	validatePluginPlatforms(manifest.platforms);

	// This prevents a plugin author from marking their own plugin as _recommended.
	if (typeof manifest._recommended !== 'undefined') {
		throw new Error(`Plugin ${manifest.id} cannot mark itself as recommended.`);
	}

	checkIfPluginCanBeAdded(existingManifests, manifest);
};

export default validateUntrustedManifest;
