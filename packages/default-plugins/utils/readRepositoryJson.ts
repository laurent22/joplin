import { readFile } from 'fs-extra';

export interface RepositoryData {
	cloneUrl: string;
	branch: string;
	commit: string;
}

export interface AllRepositoryData {
	[pluginId: string]: RepositoryData;
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

		assertPropertyIsString('cloneUrl');
		assertPropertyIsString('branch');
		assertPropertyIsString('commit');
	}

	return parsedJson;
};

export default readRepositoryJson;
