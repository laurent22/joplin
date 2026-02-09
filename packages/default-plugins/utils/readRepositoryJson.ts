import { readFile } from 'fs-extra';

export enum BuiltInPluginType {
	// Plugins that need to be built when building Joplin (e.g. if the plugin
	// needs to be patched)
	Built,
	// Plugins that can be fetched directly from NPM. Must also be marked as a
	// dev dependency.
	FromNpm,
}

export interface RepositoryData {
	type: BuiltInPluginType.Built;
	cloneUrl: string;
	branch: string;
	commit: string;
}

export interface NpmReference {
	type: BuiltInPluginType.FromNpm;
	package: string;
}

export interface AllRepositoryData {
	[pluginId: string]: RepositoryData|NpmReference;
}

const readRepositoryJson = async (repositoryDataFilepath: string): Promise<AllRepositoryData> => {
	const fileContent = await readFile(repositoryDataFilepath, 'utf8');
	const parsedJson = JSON.parse(fileContent);

	// Validate
	for (const pluginId in parsedJson) {
		if (typeof parsedJson[pluginId] !== 'object') {
			throw new Error('pluginRepositories should map from plugin IDs to objects.');
		}

		const assertPropertyIsString = (propertyName: string) => {
			if (typeof parsedJson[pluginId][propertyName] !== 'string') {
				throw new Error(`Plugin ${pluginId} should have field '${propertyName}' of type string.`);
			}
		};

		let type;
		if ('branch' in parsedJson[pluginId]) {
			assertPropertyIsString('cloneUrl');
			assertPropertyIsString('branch');
			assertPropertyIsString('commit');
			type = BuiltInPluginType.Built;
		} else {
			assertPropertyIsString('package');
			type = BuiltInPluginType.FromNpm;
		}
		parsedJson[pluginId] = { ...parsedJson[pluginId], type };
	}

	return parsedJson;
};

export default readRepositoryJson;
