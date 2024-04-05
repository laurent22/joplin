// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function caseInsensitiveFindManifest(manifests: any, manifestId: string): any {
	for (const id of Object.keys(manifests)) {
		if (id.toLowerCase() === manifestId.toLowerCase()) return manifests[id];
	}
	return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export default function(existingManifests: any, manifest: any) {
	// If there's already a plugin with this ID published under a different
	// package name, we skip it. Otherwise it would allow anyone to overwrite
	// someone else plugin just by using the same ID. So the first plugin with
	// this ID that was originally added is kept.
	//
	// We need case insensitive match because the filesystem might be case
	// insensitive too.
	const originalManifest = caseInsensitiveFindManifest(existingManifests, manifest.id);

	if (originalManifest && originalManifest._npm_package_name !== manifest._npm_package_name) {
		throw new Error(`Plugin "${manifest.id}" from npm package "${manifest._npm_package_name}" has already been published under npm package "${originalManifest._npm_package_name}". Plugin from package "${originalManifest._npm_package_name}" will not be imported.`);
	}

	// Don't add a plugin if there is already a plugin with the same ID but
	// different casing.
	if (originalManifest && originalManifest.id !== manifest.id) {
		throw new Error(`Plugin "${manifest.id}" cannot be published because there is already a plugin with ID "${originalManifest.id}". A new package, under a different name, should be published if the plugin ID needs to change.`);
	}
}
