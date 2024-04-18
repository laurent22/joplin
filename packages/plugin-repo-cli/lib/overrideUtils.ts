import * as path from 'path';
import { readJsonFile } from './utils';

export interface ManifestOverride {
	_obsolete?: boolean;
	_recommended?: boolean;
	_superseded_package?: string;
}

export type ManifestOverrides = Record<string, ManifestOverride>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export function applyManifestOverrides(manifests: any, overrides: ManifestOverrides) {
	for (const [pluginId, override] of Object.entries(overrides)) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const manifest: any = manifests[pluginId];

		if (!manifest) {
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

export function getObsoleteManifests(overrides: ManifestOverrides) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const output: any = {};

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

export async function readManifestOverrides(repoDir: string): Promise<ManifestOverrides> {
	return readJsonFile(pluginManifestOverridesPath(repoDir), {});
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
