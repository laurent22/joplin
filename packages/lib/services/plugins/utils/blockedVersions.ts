import { satisfies, validateStrict } from 'compare-versions';
import { PluginManifest } from './types';

// Maps a plugin ID to its blocked versions. Each entry is "*", an exact version, or a semver range
// such as ">=1.2.3", so that versions published by an attacker after the block are also covered.
export type BlockedPluginVersions = Record<string, string[]>;

const entryMatches = (entry: string, version: string) => {
	if (entry === '*') return true;
	try {
		return satisfies(version, entry);
	} catch (error) {
		// Fail closed: a malformed entry still blocks the plugin
		return true;
	}
};

export const isVersionBlocked = (blockedVersions: string[] | undefined, version: string) => {
	if (!Array.isArray(blockedVersions)) return false;
	return blockedVersions.some(entry => entryMatches(entry, version));
};

export const isValidBlockedVersionEntry = (entry: unknown) => {
	if (typeof entry !== 'string') return false;
	if (entry === '*' || validateStrict(entry)) return true;
	// Partial versions such as "1.2" are accepted by satisfies() but silently match nothing
	if (!/[<>=^~|]|\s-\s/.test(entry)) return false;
	try {
		satisfies('0.0.0', entry);
		return true;
	} catch (error) {
		return false;
	}
};

export const isRepoManifestBlocked = (manifest: PluginManifest) => {
	return isVersionBlocked(manifest._blocked_versions, manifest.version);
};

export const blockedVersionsFromManifests = (manifests: PluginManifest[]) => {
	const output: BlockedPluginVersions = {};
	for (const manifest of manifests) {
		if (Array.isArray(manifest._blocked_versions) && manifest._blocked_versions.length) {
			output[manifest.id] = manifest._blocked_versions.filter(v => typeof v === 'string');
		}
	}
	return output;
};
