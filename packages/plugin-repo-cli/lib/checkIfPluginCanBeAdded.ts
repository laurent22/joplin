import { PluginManifest } from '@joplin/lib/services/plugins/utils/types';
import { normalizeRepoUrl } from './utils';
import { PluginSubmissionOptions } from './types';

type PluginManifests = Record<string, PluginManifest>;

function caseInsensitiveFindManifest(manifests: PluginManifests, manifestId: string): PluginManifest | null {
	for (const id of Object.keys(manifests)) {
		if (id.toLowerCase() === manifestId.toLowerCase()) return manifests[id];
	}
	return null;
}

export default function(existingManifests: PluginManifests, manifest: PluginManifest, options: PluginSubmissionOptions) {
	// If there's already a plugin with this ID published under a different
	// repository/package name, we skip it. Otherwise it would allow anyone to overwrite
	// someone else plugin just by using the same ID. So the first plugin with
	// this ID that was originally added is kept.
	//
	// We need case insensitive match because the filesystem might be case
	// insensitive too.
	const originalManifest = caseInsensitiveFindManifest(existingManifests, manifest.id);

	if (originalManifest) {
		const originalRepo = normalizeRepoUrl(originalManifest.repository_url);
		const newRepo = normalizeRepoUrl(manifest.repository_url);

		if (options.source === 'npm') {
			if (originalManifest._npm_package_name !== manifest._npm_package_name) {
				throw new Error(`Plugin "${manifest.id}" from npm package "${manifest._npm_package_name}" has already been published under npm package "${originalManifest._npm_package_name}". Plugin from package "${originalManifest._npm_package_name}" will not be imported.`);
			}

			// We will include repository check as a mandatory check even in npm
			// The repository URL must not be removed or changed, but this will allow
			// updating of plugin if both old and new manifest does not have repository url
			if (originalRepo && (!newRepo || originalRepo !== newRepo)) {
				throw new Error(`Plugin "${manifest.id}" from repository "${manifest.repository_url}" has already been published under repository "${originalManifest.repository_url}".`);
			}
		} else if (options.source === 'repository') {
			if (originalRepo) {
				if (!newRepo || originalRepo !== newRepo) {
					throw new Error(`Plugin "${manifest.id}" from repository "${manifest.repository_url}" has already been published under repository "${originalManifest.repository_url}".`);
				}
			} else if (newRepo) {
				throw new Error(`Plugin "${manifest.id}" has already been published from npm package "${originalManifest._npm_package_name}". A maintainer must verify and register its repository URL before it can be published from a repository.`);
			}
		}

		// Don't add a plugin if there is already a plugin with the same ID
		// but different casing
		if (originalManifest.id !== manifest.id) {
			throw new Error(`Plugin "${manifest.id}" cannot be published because there is already a plugin with ID "${originalManifest.id}". A new package, under a different name, should be published if the plugin ID needs to change.`);
		}
	}
}
