import { resolve } from 'path';
import { readJsonFile } from './utils';
import { Manifest, Manifests } from './types';

export interface ManifestDefaults {
	[pluginId: string]: Partial<Manifest>;
}

export const readManifestDefaults = (repoDir: string): Promise<ManifestDefaults> => {
	return readJsonFile(resolve(repoDir, 'manifestDefaults.json'), {});
};

const applyManifestDefaults = (manifests: Manifests, manifestDefaults: ManifestDefaults) => {
	const result = { ...manifests };
	for (const [pluginId, defaults] of Object.entries(manifestDefaults)) {
		if (Object.prototype.hasOwnProperty.call(result, pluginId)) {
			result[pluginId] = {
				...defaults,
				...result[pluginId],
			};
		}
	}
	return result;
};

export default applyManifestDefaults;
