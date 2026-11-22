import * as path from 'path';
import { readJsonFile } from './utils';
import { PluginManifest } from '@joplin/lib/services/plugins/utils/types';
import { isValidBlockedVersionEntry } from '@joplin/lib/services/plugins/utils/blockedVersions';

export interface ManifestOverride {
	_obsolete?: boolean;
	_recommended?: boolean;
	_superseded_package?: string;
	_blocked_versions?: string[];
}

export type ManifestOverrides = Record<string, ManifestOverride>;
type PluginManifests = Record<string, PluginManifest>;

export function applyManifestOverrides(manifests: PluginManifests, overrides: ManifestOverrides) {
	for (const [pluginId, override] of Object.entries(overrides)) {
		const manifest = manifests[pluginId] as PluginManifest & Record<string, unknown>;

		if (!manifest) {
			if (override._blocked_versions) {
				throw new Error(`Cannot block plugin ${pluginId}: it is not in manifests.json`);
			}

			// If the manifest does not exist in the destination, it means the
			// plugin has been taken out, so the obsolete property should be set
			// to `true`. If not, it's an error.
			if (!override._obsolete) {
				console.error(`Could not find manifest for plugin ${pluginId} when applying override`);
			}
			continue;
		}

		for (const [propName, propValue] of Object.entries(override)) {
			manifest[propName] = propValue;
		}
	}

	return manifests;
}

export function getObsoleteManifests<T extends { _obsolete?: boolean }>(overrides: Record<string, T>): Record<string, T> {
	const output: Record<string, T> = {};

	for (const [pluginId, override] of Object.entries(overrides)) {
		if (override._obsolete) {
			output[pluginId] = override;
		}
	}

	return output;
}

function pluginManifestOverridesPath(repoDir: string): string {
	return path.resolve(repoDir, 'manifestOverrides.json');
}

export const validateManifestOverrides = (overrides: ManifestOverrides) => {
	for (const [pluginId, override] of Object.entries(overrides)) {
		const blockedVersions = override._blocked_versions;
		if (blockedVersions === undefined) continue;
		if (!Array.isArray(blockedVersions) || !blockedVersions.length || !blockedVersions.every(isValidBlockedVersionEntry)) {
			throw new Error(`Invalid _blocked_versions for plugin ${pluginId}: ${JSON.stringify(blockedVersions)}. It must be a non-empty array of "*", exact versions or semver ranges.`);
		}
	}
};

export async function readManifestOverrides(repoDir: string): Promise<ManifestOverrides> {
	const overrides: ManifestOverrides = await readJsonFile(pluginManifestOverridesPath(repoDir), {});
	validateManifestOverrides(overrides);
	return overrides;
}

export const getSupersededPackages = (manifestOverrides: ManifestOverrides): string[] => {
	const supersededPackages = [];

	for (const id in manifestOverrides) {
		const supersededPackage = manifestOverrides[id]._superseded_package;
		if (supersededPackage) {
			supersededPackages.push(supersededPackage);
		}
	}

	return supersededPackages;
};
