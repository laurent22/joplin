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

// Each comparator is checked on its own because satisfies() short-circuits, so "<1.0.0 || garbage"
// would pass. This also rejects partial versions such as "1.2", which silently match nothing.
// Only spaces are accepted as separators since satisfies() throws on tabs.
export const isValidBlockedVersionEntry = (entry: unknown) => {
	if (typeof entry !== 'string') return false;
	if (entry === '*') return true;
	const comparators = entry.split('||').flatMap(part => part.trim().split(/ +- +| +/));
	return comparators.every(c => validateStrict(c.replace(/^(<=|>=|<|>|=|\^|~)/, '')));
};

export const isRepoManifestBlocked = (manifest: PluginManifest) => {
	return isVersionBlocked(manifest._blocked_versions, manifest.version);
};

// A mirror may serve a stale copy of the manifests, so it can add blocks but never lift them
export const mergeBlockedVersions = (current: BlockedPluginVersions, fetched: BlockedPluginVersions) => {
	const output = { ...current };
	for (const [pluginId, versions] of Object.entries(fetched)) {
		output[pluginId] = [...new Set([...(output[pluginId] ?? []), ...versions])];
	}
	return output;
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
