import validatePluginId from '@joplin/lib/services/plugins/utils/validatePluginId';
import validatePluginVersion from '@joplin/lib/services/plugins/utils/validatePluginVersion';
import validatePluginPlatforms from '@joplin/lib/services/plugins/utils/validatePluginPlatforms';
import checkIfPluginCanBeAdded from './checkIfPluginCanBeAdded';
import { PluginManifest } from '@joplin/lib/services/plugins/utils/types';
import { PluginSubmissionOptions } from './types';

// For npm submissions, assume that
// 1. manifest._npm_package_name was assigned by the CLI.
// 2. All fields in repository submissions are untrusted.
const validateUntrustedManifest = (
	manifest: PluginManifest,
	existingManifests: Record<string, PluginManifest>,
	options: PluginSubmissionOptions,
) => {
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

	if (options.source === 'repository') {
		if (!manifest.repository_url?.trim()) {
			throw new Error(`Plugin ${manifest.id} must specify repository_url when published from a repository.`);
		}

		if (typeof manifest._npm_package_name !== 'undefined') {
			throw new Error(`Plugin ${manifest.id} cannot specify _npm_package_name when published from a repository.`);
		}
	}

	checkIfPluginCanBeAdded(existingManifests, manifest, options);
};

export default validateUntrustedManifest;
